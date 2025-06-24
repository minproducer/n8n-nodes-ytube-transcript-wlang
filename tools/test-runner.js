#!/usr/bin/env node

const { YoutubeTranscripter } = require('../nodes/YouTubeTranscriptWithLanguage/YouTubeTranscriptWithLanguage.node.js');
const fs = require('fs');
const path = require('path');

// Subclass YoutubeTranscripter for testing purposes
class YoutubeTranscripterTest extends YoutubeTranscripter {
    // override nếu cần log thêm hoặc test riêng
    async execute() {
        // Bạn có thể log thêm hoặc theo dõi chi tiết ở đây
        return await super.execute();
    }
}

// Mock n8n context
class MockN8nContext {
    constructor(inputData, parameters) {
        this.inputData = inputData;
        this.parameters = parameters;
        this.continueOnFailValue = false;
    }

    getInputData() {
        return this.inputData;
    }
    // eslint-disable-next-line no-unused-vars
    getNodeParameter(paramName, itemIndex = 0) {
        return this.parameters[paramName];
    }

    continueOnFail() {
        return this.continueOnFailValue;
    }

    getNode() {
        return { name: 'YouTube Transcript Test' };
    }

    // Thêm các method khác nếu node cần
    getCredentials() {
        return {};
    }

    getWorkflow() {
        return { id: 'test-workflow' };
    }
}

// Default test configuration
const defaultConfig = {
    videoId: 'dQw4w9WgXcQ',
    lang: 'en',
    binaryPath: 'yt-dlp',
    authMethod: 'none',
    cookieString: '',
    cookieFile: '',
    preferManual: true,
    outputFormat: 'structured',
    includeMetadata: true
};

// Test cases
const testCases = [
    {
        name: 'Basic YouTube Video Test',
        input: [{ json: {} }],
        params: defaultConfig
    },
    {
        name: 'Vietnamese Language Test',
        input: [{ json: {} }],
        params: { ...defaultConfig, lang: 'vi' }
    },
    {
        name: 'Plain Text Output Test',
        input: [{ json: {} }],
        params: { ...defaultConfig, outputFormat: 'plainText' }
    },
    {
        name: 'Both Output Format Test',
        input: [{ json: {} }],
        params: { ...defaultConfig, outputFormat: 'both' }
    },
    {
        name: 'Auto Subtitles Test',
        input: [{ json: {} }],
        params: { ...defaultConfig, preferManual: false }
    },
    {
        name: 'No Metadata Test',
        input: [{ json: {} }],
        params: { ...defaultConfig, includeMetadata: false }
    }
];

async function runTest(testCase, saveResult = false, outputDir = './test-results', saveFile = false) {
    console.log(`\n🧪 Running test: ${testCase.name}`);
    console.log('─'.repeat(50));

    try {
        // Create node instance using test subclass
        const node = new YoutubeTranscripterTest();

        // Create mock context
        const mockContext = new MockN8nContext(testCase.input, testCase.params);

        // Temporarily assign context methods to node
        const originalMethods = {};
        const contextMethods = ['getInputData', 'getNodeParameter', 'continueOnFail', 'getNode', 'getCredentials', 'getWorkflow'];

        contextMethods.forEach(method => {
            if (typeof mockContext[method] === 'function') {
                originalMethods[method] = node[method];
                node[method] = mockContext[method].bind(mockContext);
            }
        });

        // Measure execution time
        const startTime = Date.now();
        const result = await node.execute();
        const executionTime = Date.now() - startTime;

        // Restore original methods
        contextMethods.forEach(method => {
            if (originalMethods[method] !== undefined) {
                node[method] = originalMethods[method];
            }
        });

        // Display results
        console.log(`✅ Test passed in ${executionTime}ms`);
        console.log(`📊 Results:`);

        if (result && result[0] && result[0].length > 0) {
            const data = result[0][0].json;
            console.log(`   - Video ID: ${data.youtubeId}`);
            console.log(`   - Subtitle Type: ${data.subtitleType || 'N/A'}`);

            if (data.metadata) {
                console.log(`   - Title: ${data.metadata.title}`);
                console.log(`   - Duration: ${data.metadata.duration}s`);
                console.log(`   - Uploader: ${data.metadata.uploader}`);
            }

            if (data.transcript) {
                console.log(`   - Transcript entries: ${data.transcript.length}`);
                console.log(`   - First entry: "${data.transcript[0]?.text?.substring(0, 100)}..."`);
            }

            if (data.transcriptText) {
                console.log(`   - Plain text length: ${data.transcriptText.length} characters`);
                console.log(`   - Plain text preview: "${data.transcriptText.substring(0, 100)}..."`);
            }

            if (data.error) {
                console.log(`   - Error: ${data.error}`);
            }

            // Save result to file if requested
            if (saveResult || saveFile) {
                const targetDir = saveFile ? './' : outputDir;
                await saveTestResult(testCase.name, result, targetDir);
            }
        }

        return { success: true, result, executionTime };

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        if (process.env.DEBUG) {
            console.log(`   Stack trace: ${error.stack}`);
        }
        return { success: false, error: error.message };
    }
}

async function saveTestResult(testName, result, outputDir) {
    try {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = `${testName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
        const filePath = path.join(outputDir, fileName);

        const resultData = {
            testName,
            timestamp: new Date().toISOString(),
            result
        };

        fs.writeFileSync(filePath, JSON.stringify(resultData, null, 2));
        console.log(`   💾 Result saved to: ${filePath}`);
    } catch (error) {
        console.log(`   ⚠️  Failed to save result: ${error.message}`);
    }
}

async function runBatchFromFile(filePath, options = {}) {
    console.log(`📂 Loading video list from: ${filePath}`);

    let videoList = [];

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const fileExt = path.extname(filePath).toLowerCase();

        if (fileExt === '.json') {
            videoList = JSON.parse(fileContent);
        } else if (fileExt === '.csv') {
            const lines = fileContent.split('\n').filter(line => line.trim());
            videoList = lines.map(line => {
                const [videoId, lang] = line.split(',');
                return { videoId: videoId.trim(), lang: lang?.trim() || 'en' };
            });
        } else {
            // Plain text file, one video ID per line
            videoList = fileContent.split('\n')
                .filter(line => line.trim())
                .map(videoId => ({ videoId: videoId.trim(), lang: 'en' }));
        }
    } catch (error) {
        console.log(`❌ Failed to load file: ${error.message}`);
        process.exit(1);
    }

    console.log(`📋 Found ${videoList.length} videos to process`);

    const results = [];
    let successCount = 0;

    for (let i = 0; i < videoList.length; i++) {
        const video = videoList[i];
        console.log(`\n[${i + 1}/${videoList.length}] Processing: ${video.videoId}`);

        const testCase = {
            name: `Batch Test - ${video.videoId}`,
            input: [{ json: {} }],
            params: {
                ...defaultConfig,
                ...options,
                videoId: video.videoId,
                lang: video.lang || options.lang || 'en'
            }
        };

        const result = await runTest(testCase, options.saveResults, options.outputDir, options.saveFile);
        results.push({
            videoId: video.videoId,
            lang: video.lang,
            ...result
        });

        if (result.success) {
            successCount++;
        }

        // Add delay between requests to be respectful
        if (i < videoList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Save batch summary
    if (options.saveResults || options.saveFile) {
        const targetDir = options.saveFile ? './' : (options.outputDir || './test-results');
        const summaryPath = path.join(targetDir, `batch_summary_${Date.now()}.json`);
        fs.writeFileSync(summaryPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            totalVideos: videoList.length,
            successCount,
            failureCount: videoList.length - successCount,
            results
        }, null, 2));
        console.log(`\n📊 Batch summary saved to: ${summaryPath}`);
    }

    console.log(`\n🎯 Batch completed: ${successCount}/${videoList.length} successful`);
    return results;
}

async function runAllTests(options = {}) {
    console.log('🚀 YouTube Transcript Node Test Runner');
    console.log('═'.repeat(50));

    // Check if yt-dlp is available
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        await execAsync(`${options.binaryPath || 'yt-dlp'} --version`);
        console.log('✅ yt-dlp is available');
    } catch (error) {
        console.log('❌ yt-dlp not found. Please install it first:');
        console.log('   pip install yt-dlp');
        process.exit(1);
    }

    let passedTests = 0;
    let totalTests = testCases.length;
    const allResults = [];

    for (const testCase of testCases) {
        // Apply CLI options to test case
        const updatedTestCase = {
            ...testCase,
            params: { ...testCase.params, ...options }
        };

        const result = await runTest(updatedTestCase, options.saveResults, options.outputDir, options.saveFile);
        allResults.push(result);

        if (result.success) {
            passedTests++;
        }
    }

    console.log('\n📈 Test Summary');
    console.log('═'.repeat(50));
    console.log(`Passed: ${passedTests}/${totalTests}`);
    console.log(`Failed: ${totalTests - passedTests}/${totalTests}`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('💥 Some tests failed!');
        process.exit(1);
    }
}

// CLI argument parsing
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--video':
            case '-v':
                options.videoId = args[++i];
                break;

            case '--url': {
                const url = args[++i];
                const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
                if (match) {
                    options.videoId = match[1];
                } else {
                    console.error('❌ Invalid YouTube URL');
                    process.exit(1);
                }
                break;
            }

            case '--lang':
            case '-l':
                options.lang = args[++i];
                break;

            case '--binary':
            case '-b':
                options.binaryPath = args[++i];
                break;

            case '--prefer-manual':
                options.preferManual = args[++i] === 'true';
                break;

            case '--format':
            case '-f':
                options.outputFormat = args[++i];
                break;

            case '--metadata':
            case '-m':
                options.includeMetadata = args[++i] === 'true';
                break;

            case '--save':
            case '-s':
                options.saveResults = true;
                break;

            case '--savefile':
                options.saveFile = true;
                break;

            case '--output-dir':
            case '-o':
                options.outputDir = args[++i];
                break;

            case '--file':
                options.batchFile = args[++i];
                break;

            case '--debug':
            case '-d':
                process.env.DEBUG = 'true';
                break;

            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }

    // Validate videoId format if provided
    if (options.videoId && !/^[\w-]{11}$/.test(options.videoId)) {
        console.error('❌ Invalid video ID format (should be 11 characters)');
        process.exit(1);
    }

    return options;
}
function showHelp() {
    console.log(`
YouTube Transcript Node Test Runner

Usage: node test-runner.js [options]

Options:
  -v, --video <id>         Test with specific video ID
  --url <youtube-url>      Extract video ID from full YouTube URL
  -l, --lang <code>        Test with specific language code
  -b, --binary <path>      Path to yt-dlp binary
  --prefer-manual <bool>   Prefer manual subtitles (true/false)
  -f, --format <type>      Output format (structured/plainText/both)
  -m, --metadata <bool>    Include metadata (true/false)
  -s, --save               Save test results to files
  --savefile               Save test results to current directory
  -o, --output-dir <path>  Output directory for saved results
  --file <path>            Run batch test from file (JSON/CSV/TXT)
  -d, --debug              Enable debug mode
  -h, --help               Show this help

Examples:
  # Basic test
  node test-runner.js

  # Custom single test with video ID
  node test-runner.js --video dQw4w9WgXcQ --lang vi --format both --save

  # Custom single test with URL
  node test-runner.js --url "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --lang en --savefile

  # Batch test from file
  node test-runner.js --file ./videos.json --save --output-dir ./results

  # Test with specific settings
  node test-runner.js --prefer-manual false --metadata false --format plainText

File formats for batch testing:
  JSON: [{"videoId": "abc123", "lang": "en"}, {"videoId": "def456", "lang": "vi"}]
  CSV:  abc123,en\\ndef456,vi
  TXT:  abc123\\ndef456
`);
}

// Custom test runner
async function runCustomTest(options) {
    const customConfig = { ...defaultConfig, ...options };

    const customTest = {
        name: 'Custom Test',
        input: [{ json: {} }],
        params: customConfig
    };

    await runTest(customTest, options.saveResults, options.outputDir, options.saveFile);
}

// Main execution
async function main() {
    const options = parseArgs();

    if (options.batchFile) {
        // Run batch test from file
        await runBatchFromFile(options.batchFile, options);
    } else if (options.videoId) {
        // Run custom single test
        console.log('🎯 Running custom test with options:', options);
        await runCustomTest(options);
    } else {
        // Run all predefined tests
        await runAllTests(options);
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runTest, MockN8nContext, runBatchFromFile };
