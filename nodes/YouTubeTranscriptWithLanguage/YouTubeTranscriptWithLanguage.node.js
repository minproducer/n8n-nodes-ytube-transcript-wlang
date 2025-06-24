const { writeFile, unlink, readFile } = require('fs/promises');
const { join } = require('path');
const { tmpdir } = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class YoutubeTranscriptWithLanguage {
    description = {
        displayName: 'YouTube Transcript With Language',
        name: 'youtubeTranscriptWithLanguage',
        icon: 'file:youtube.svg',
        group: ['transform'],
        version: 1,
        description: 'Fetch YouTube subtitles with language and cookie support using yt-dlp',
        defaults: {
            name: 'YouTube Transcript',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Video ID/URL',
                name: 'videoId',
                type: 'string',
                default: '',
                required: true,
                description: 'The YouTube video ID or URL',
            },
            {
                displayName: 'Language',
                name: 'lang',
                type: 'string',
                default: 'en',
                description: 'Language code for the transcript (e.g., en, fr)',
            },
            {
                displayName: 'Prefer Manual Subtitles',
                name: 'preferManual',
                type: 'boolean',
                default: true,
                description: 'Whether to prefer manual subtitles over auto-generated ones',
            },
            {
                displayName: 'Output Format',
                name: 'outputFormat',
                type: 'options',
                options: [
                    { name: 'Structured', value: 'structured' },
                    { name: 'Plain Text', value: 'plainText' },
                    { name: 'Both', value: 'both' },
                ],
                default: 'structured',
                description: 'Format of the transcript output',
            },
            {
                displayName: 'Include Metadata',
                name: 'includeMetadata',
                type: 'boolean',
                default: false,
                description: 'Whether to include video metadata',
            },
            {
                displayName: 'Binary Path',
                name: 'binaryPath',
                type: 'string',
                default: 'yt-dlp',
                description: 'Path to yt-dlp binary',
            },
            {
                displayName: 'Authentication Method',
                name: 'authMethod',
                type: 'options',
                options: [
                    { name: 'None', value: 'none' },
                    { name: 'Cookie String', value: 'cookieString' },
                    { name: 'Cookie File', value: 'cookieFile' },
                ],
                default: 'none',
                description: 'Authentication method for restricted videos',
            },
            {
                displayName: 'Cookie String',
                name: 'cookieString',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        authMethod: ['cookieString'],
                    },
                },
                description: 'Cookie string for authentication',
            },
            {
                displayName: 'Cookie File Path',
                name: 'cookieFile',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        authMethod: ['cookieFile'],
                    },
                },
                description: 'Path to cookie file for authentication',
            },
        ],
    };

    async execute() {
        const items = this.getInputData();
        const returnData = [];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            let cookieFilePath = '';
            let authMethod = 'none'; // Moved outside to be available in finally

            try {
                const videoId = this.getNodeParameter('videoId', itemIndex);
                const lang = this.getNodeParameter('lang', itemIndex) || 'en';
                const preferManual = this.getNodeParameter('preferManual', itemIndex);
                const outputFormat = this.getNodeParameter('outputFormat', itemIndex);
                const includeMetadata = this.getNodeParameter('includeMetadata', itemIndex);
                const binaryPath = this.getNodeParameter('binaryPath', itemIndex);
                authMethod = this.getNodeParameter('authMethod', itemIndex);

                if (!videoId) throw new Error('The video ID/URL parameter is empty.');

                if (authMethod === 'cookieString') {
                    const cookieString = this.getNodeParameter('cookieString', itemIndex);
                    if (cookieString) {
                        cookieFilePath = join(tmpdir(), `yt-cookies-${Date.now()}-${itemIndex}.txt`);
                        const cookieContent = '# Netscape HTTP Cookie File\n' + cookieString;
                        try {
                            await writeFile(cookieFilePath, cookieContent);
                        } catch {
                            // Ignore writeFile error (likely permission or temp issue)
                        }
                    }
                } else if (authMethod === 'cookieFile') {
                    cookieFilePath = this.getNodeParameter('cookieFile', itemIndex);
                }

                const videoUrl = videoId.includes('youtube.com') || videoId.includes('youtu.be')
                    ? videoId
                    : `https://www.youtube.com/watch?v=${videoId}`;

                let parsedInfo = null;
                if (includeMetadata) {
                    parsedInfo = await this.getVideoMetadata(binaryPath, cookieFilePath, videoUrl);
                }

                const metadataForSubtitles = parsedInfo || await this.getVideoMetadata(binaryPath, cookieFilePath, videoUrl);
                const subtitles = metadataForSubtitles.subtitles || {};
                const autoCaptions = metadataForSubtitles.automatic_captions || {};

                let selectedSubtitle = null;
                let isManualSubtitle = false;
                const langVariants = [lang, `${lang}_US`, `${lang}-US`];

                for (const langVar of langVariants) {
                    if (preferManual && subtitles[langVar]?.length) {
                        selectedSubtitle = subtitles[langVar];
                        isManualSubtitle = true;
                        break;
                    } else if (!preferManual && (subtitles[langVar]?.length || autoCaptions[langVar]?.length)) {
                        selectedSubtitle = subtitles[langVar] || autoCaptions[langVar];
                        isManualSubtitle = !!subtitles[langVar];
                        break;
                    }
                }

                if (!selectedSubtitle) {
                    throw new Error(`No transcript found for this video with language "${lang}"`);
                }

                const formattedTranscript = await this.downloadAndParseTranscript(
                    binaryPath, cookieFilePath, videoUrl, lang, itemIndex, isManualSubtitle
                );

                const result = {
                    youtubeId: videoId,
                    subtitleType: isManualSubtitle ? 'manual' : 'auto-generated',
                };

                if (outputFormat === 'structured' || outputFormat === 'both') {
                    result.transcript = formattedTranscript;
                }
                if (outputFormat === 'plainText' || outputFormat === 'both') {
                    result.transcriptText = formattedTranscript.map(i => i.text).join(' ');
                }
                if (includeMetadata && parsedInfo) {
                    result.metadata = this.extractMetadata(parsedInfo);
                }

                returnData.push({ json: result });
            } catch (error) {
                if (error.message.includes('yt-dlp') || error.message.includes('command not found')) {
                    throw new Error('yt-dlp binary not found or failed to run. Check binaryPath.');
                }
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }
                throw error;
            } finally {
                if (cookieFilePath && authMethod === 'cookieString') {
                    try {
                        await unlink(cookieFilePath);
                    } catch {
                        // Ignore unlink error
                    }
                }
            }
        }
        return [returnData];
    }

    async getVideoMetadata(binaryPath, cookieFilePath, videoUrl) {
        let cmd = `${binaryPath} --dump-json --skip-download`;
        if (cookieFilePath) cmd += ` --cookies "${cookieFilePath}"`;
        cmd += ` "${videoUrl}"`;

        try {
            const { stdout } = await execAsync(cmd);
            return JSON.parse(stdout);
        } catch (error) {
            throw new Error(`Failed to fetch video metadata: ${error.message}`);
        }
    }

    async downloadAndParseTranscript(binaryPath, cookieFilePath, videoUrl, lang, itemIndex, isManualSubtitle) {
        const outputPath = join(tmpdir(), `transcript-${Date.now()}-${itemIndex}`);
        const flag = isManualSubtitle ? 'write-subs' : 'write-auto-subs';

        let cmd = `${binaryPath} --${flag} --sub-lang ${lang} --skip-download --output "${outputPath}.%(ext)s"`;
        if (cookieFilePath) cmd += ` --cookies "${cookieFilePath}"`;
        cmd += ` "${videoUrl}"`;

        try {
            await execAsync(cmd);
        } catch (error) {
            throw new Error(`Failed to download transcript: ${error.message}`);
        }

        const possibleFiles = [
            `${outputPath}.${lang}.vtt`, `${outputPath}.${lang}.srt`,
            `${outputPath}.${lang}_US.vtt`, `${outputPath}.${lang}_US.srt`,
            `${outputPath}.${lang}-US.vtt`, `${outputPath}.${lang}-US.srt`,
        ];

        let transcriptContent = '';
        let usedFile = '';

        for (const file of possibleFiles) {
            try {
                transcriptContent = await readFile(file, 'utf-8');
                usedFile = file;
                break;
            } catch {
                // File not found, try next
            }
        }

        if (!transcriptContent) {
            throw new Error(`Could not read transcript file for language "${lang}"`);
        }

        const result = this.parseTranscriptContent(transcriptContent);

        if (usedFile) {
            try {
                await unlink(usedFile);
            } catch {
                // Ignore unlink error
            }
        }

        return result;
    }

    extractMetadata(info) {
        return {
            title: info.title,
            duration: info.duration,
            uploader: info.uploader,
            uploadDate: info.upload_date,
            view_count: info.view_count,
            description: info.description,
            thumbnail: info.thumbnail,
            tags: info.tags,
            categories: info.categories,
        };
    }

    parseTranscriptContent(content) {
        const transcript = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes(' --> ')) {
                const [startTime, endTime] = line.split(' --> ');
                const start = this.timeToSeconds(startTime);
                const end = this.timeToSeconds(endTime);
                const duration = end - start;

                let text = '';
                i++;
                while (i < lines.length && lines[i].trim() && !lines[i].includes(' --> ')) {
                    const clean = lines[i].replace(/<[^>]*>/g, '').trim();
                    if (clean) text += clean + ' ';
                    i++;
                }
                i--;

                if (text.trim()) {
                    transcript.push({
                        text: text.trim(),
                        start: +start.toFixed(3),
                        duration: +duration.toFixed(3),
                    });
                }
            }
        }
        return transcript;
    }

    timeToSeconds(timeString) {
        const parts = timeString.split(':');
        if (parts.length === 3) {
            const [h, m, s] = parts;
            return (+h) * 3600 + (+m) * 60 + parseFloat(s);
        }
        if (parts.length === 2) {
            const [m, s] = parts;
            return (+m) * 60 + parseFloat(s);
        }
        return parseFloat(timeString);
    }
}

module.exports = YoutubeTranscriptWithLanguage;