const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');


const ffmpegPath = "D:\\Work\\electron\\ffmpeg.exe"; 
ffmpeg.setFfmpegPath(ffmpegPath);

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('convert-files', async (event, files, conversionType) => {
    console.log(conversionType);
    
    const totalFiles = files.length;
    let completedFiles = 0;

    const promises = files.map(file => {
        let output;
        let format;
        if (conversionType === 'opusToOgg') {
            output = file.replace('.opus', '.ogg');
            format = 'ogg';
        } else if (conversionType === 'mp4ToWebm') {
            output = file.replace('.mp4', '.webm');
            format = 'webm';
        } else if (conversionType === 'imageToPdf') {
            output = file.replace(/\.[^.]+$/, '.pdf');
            return convertImageToPdf(file, output, event, totalFiles, completedFiles++);
        }

        return new Promise((resolve, reject) => {
            ffmpeg(file)
                .toFormat(format)
                .on('progress', (progress) => {
                    const progressPercent = ((completedFiles + (progress.percent / 100)) / totalFiles) * 100;
                    event.sender.send('conversion-progress', Math.floor(progressPercent));
                })
                .on('end', () => {
                    completedFiles += 1;
                    event.sender.send('conversion-progress', Math.floor((completedFiles / totalFiles) * 100));
                    resolve(output);
                })
                .on('error', (err) => reject(err))
                .save(output);
        });
    });

    return Promise.all(promises);
});

async function convertImageToPdf(imagePath, outputPath, event, totalFiles, completedFiles) {
    const pdfDoc = await PDFDocument.create();
    const imageBytes = fs.readFileSync(imagePath);
    let image;
    
    // Tentar embutir a imagem como JPEG, se falhar, tentar como PNG
    try {
        image = await pdfDoc.embedJpg(imageBytes);
    } catch (error) {
        console.log(`Erro ao embutir JPG: ${error}. Tentando como PNG.`);
        try {
            image = await pdfDoc.embedPng(imageBytes);
        } catch (pngError) {
            console.error(`Erro ao embutir PNG: ${pngError}`);
            throw new Error(`Formato de imagem não suportado ou arquivo corrompido: ${imagePath}`);
        }
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);

    const progressPercent = ((completedFiles + 1) / totalFiles) * 100;
    event.sender.send('conversion-progress', Math.floor(progressPercent));
    return outputPath;
}