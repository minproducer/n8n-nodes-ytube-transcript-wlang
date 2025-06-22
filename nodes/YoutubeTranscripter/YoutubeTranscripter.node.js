const { writeFile, unlink, readFile } = require('fs/promises');
const { join } = require('path');
const { tmpdir } = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class YoutubeTranscripter {
    constructor() {
        this.description = {
            displayName: 'YouTube Transcript',
            name: 'youtubeTranscripter',
            icon: 'file:youtube.svg',
            group: ['transform'],
            version: 1,
            description: 'Fetches the transcript of a YouTube video using yt-dlp',
            defaults: {
                name: 'YouTube Transcript',
            },
            inputs: ['main'],
            outputs: ['main'],
            properties: [
                {
                    displayName: 'Video ID or URL',
                    name: 'videoId',
                    type: 'string',
                    required: true,
                    default: '',
                    description: 'The ID or URL of the YouTube video to fetch the transcript for',
                },
                {
                    displayName: 'Subtitle Language',
                    name: 'lang',
                    type: 'string',
                    default: 'en',
                    placeholder: 'vi, en, ja, ...',
                    description: 'Language code for the subtitles (e.g., en = English, vi = Vietnamese)',
                },
                {
                    displayName: 'Binary Path',
                    name: 'binaryPath',
                    type: 'string',
                    required: true,
                    default: 'yt-dlp',
                    description: 'Path to the yt-dlp binary',
                },
                {
                    displayName: 'Authentication Method',
                    name: 'authMethod',
                    type: 'options',
                    options: [
                        {
                            name: 'None',
                            value: 'none',
                        },
                        {
                            name: 'Cookie String',
                            value: 'cookieString',
                        },
                        {
                            name: 'Cookie File Path',
                            value: 'cookieFile',
                        },
                    ],
                    default: 'none',
                    description: 'Method to authenticate with YouTube',
                },
                {
                    displayName: 'Cookie String',
                    name: 'cookieString',
                    type: 'string',
                    typeOptions: {
                        password: true,
                    },
                    default: '',
                    description: 'YouTube cookie string in Netscape format',
                    displayOptions: {
                        show: {
                            authMethod: ['cookieString'],
                        },
                    },
                },
                {
                    displayName: 'Cookie File Path',
                    name: 'cookieFile',
                    type: 'string',
                    default: '',
                    description: 'Path to the cookie file in Netscape format',
                    displayOptions: {
                        show: {
                            authMethod: ['cookieFile'],
                        },
                    },
                },
            ],
        };
    }

    async execute() {
        const items = this.getInputData();
        const returnData = [];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            let cookieFilePath = '';

            try {
                const videoId = this.getNodeParameter('videoId', itemIndex);
                const lang = this.getNodeParameter('lang', itemIndex) || 'en';
                const binaryPath = this.getNodeParameter('binaryPath', itemIndex);
                const authMethod = this.getNodeParameter('authMethod', itemIndex);

                if (!videoId) {
                    throw new Error('The video ID/URL parameter is empty.');
                }

                // Xử lý authentication
                if (authMethod === 'cookieString') {
                    const cookieString = this.getNodeParameter('cookieString', itemIndex);
                    if (cookieString) {
                        cookieFilePath = join(tmpdir(), `yt-cookies-${Date.now()}-${itemIndex}.txt`);
                        const cookieContent = '# Netscape HTTP Cookie File\n' + cookieString;
                        await writeFile(cookieFilePath, cookieContent);
                    }
                } else if (authMethod === 'cookieFile') {
                    cookieFilePath = this.getNodeParameter('cookieFile', itemIndex);
                }

                const videoUrl = videoId.includes('youtube.com') || videoId.includes('youtu.be')
                    ? videoId
                    : `https://www.youtube.com/watch?v=${videoId}`;

                // Lấy metadata video
                let metadataCommand = `${binaryPath} --dump-json --skip-download`;
                if (cookieFilePath) {
                    metadataCommand += ` --cookies "${cookieFilePath}"`;
                }
                metadataCommand += ` "${videoUrl}"`;

                const { stdout: metadataOutput } = await execAsync(metadataCommand);
                const parsedInfo = JSON.parse(metadataOutput);

                // Kiểm tra subtitle có sẵn không
                const subtitles = parsedInfo.subtitles || {};
                const autoCaptions = parsedInfo.automatic_captions || {};

                const availableSubtitles = subtitles[lang] || subtitles[`${lang}_US`] ||
                    autoCaptions[lang] || autoCaptions[`${lang}_US`];

                if (!availableSubtitles || availableSubtitles.length === 0) {
                    throw new Error(`No transcript found for this video with language "${lang}"`);
                }

                // Lấy transcript thực tế bằng cách download subtitle
                const outputPath = join(tmpdir(), `transcript-${Date.now()}-${itemIndex}`);
                let transcriptCommand = `${binaryPath} --write-auto-subs --sub-lang ${lang} --skip-download --output "${outputPath}.%(ext)s"`;

                if (cookieFilePath) {
                    transcriptCommand += ` --cookies "${cookieFilePath}"`;
                }
                transcriptCommand += ` "${videoUrl}"`;

                await execAsync(transcriptCommand);

                // Đọc file transcript
                const possibleFiles = [
                    `${outputPath}.${lang}.vtt`,
                    `${outputPath}.${lang}.srt`,
                    `${outputPath}.${lang}_US.vtt`,
                    `${outputPath}.${lang}_US.srt`,
                ];

                let transcriptContent = '';
                let usedFile = '';

                for (const filePath of possibleFiles) {
                    try {
                        transcriptContent = await readFile(filePath, 'utf-8');
                        usedFile = filePath;
                        break;
                    } catch {
                        // Thử file tiếp theo
                    }
                }

                if (!transcriptContent) {
                    throw new Error(`Could not read transcript file for language "${lang}"`);
                }

                // Parse transcript content
                const formattedTranscript = this.parseTranscriptContent(transcriptContent);

                returnData.push({
                    json: {
                        youtubeId: videoId,
                        transcript: formattedTranscript,
                        metadata: {
                            title: parsedInfo.title,
                            duration: parsedInfo.duration,
                            uploader: parsedInfo.uploader,
                            uploadDate: parsedInfo.upload_date,
                            view_count: parsedInfo.view_count,
                            description: parsedInfo.description,
                        },
                    },
                });

                // Cleanup transcript file
                if (usedFile) {
                    try {
                        await unlink(usedFile);
                    } catch {
                        // ignore cleanup errors
                    }
                }

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }
                throw error;
            } finally {
                // Cleanup cookie file
                if (cookieFilePath && authMethod === 'cookieString') {
                    try {
                        await unlink(cookieFilePath);
                    } catch {
                        // ignore cleanup errors
                    }
                }
            }
        }

        return [returnData];
    }

    parseTranscriptContent(content) {
        const transcript = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // VTT format: 00:00:00.000 --> 00:00:03.000
            if (line.includes(' --> ')) {
                const [startTime, endTime] = line.split(' --> ');
                const start = this.timeToSeconds(startTime.trim());
                const end = this.timeToSeconds(endTime.trim());
                const duration = end - start;

                // Lấy text từ các dòng tiếp theo
                i++;
                let text = '';
                while (i < lines.length && lines[i].trim() && !lines[i].includes(' --> ')) {
                    const textLine = lines[i].trim();
                    // Loại bỏ các tag HTML nếu có
                    const cleanText = textLine.replace(/<[^>]*>/g, '');
                    if (cleanText) {
                        text += cleanText + ' ';
                    }
                    i++;
                }
                i--; // Quay lại vì loop sẽ tăng i

                if (text.trim()) {
                    transcript.push({
                        text: text.trim(),
                        start: Math.round(start * 1000) / 1000,
                        duration: Math.round(duration * 1000) / 1000
                    });
                }
            }
        }

        return transcript;
    }

    timeToSeconds(timeString) {
        const parts = timeString.split(':');
        if (parts.length === 3) {
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            const seconds = parseFloat(parts[2]) || 0;
            return hours * 3600 + minutes * 60 + seconds;
        } else if (parts.length === 2) {
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseFloat(parts[1]) || 0;
            return minutes * 60 + seconds;
        }
        return parseFloat(timeString) || 0;
    }
}

module.exports = { YoutubeTranscripter };
