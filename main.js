const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const zlib = require('zlib'); 

const ffmpegPath = "C:\\ffmpeg\\ffmpeg.exe"; 
ffmpeg.setFfmpegPath(ffmpegPath);

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
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
        } else if (conversionType === 'webmToOgg') {
            output = file.replace('.webm', '.ogg');
            format = 'ogg';
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

ipcMain.handle('merge-pdfs', async (event, files) => {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
        const pdfBytes = fs.readFileSync(file);
        const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true }); // Ignora a criptografia
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    const mergedPdfBytes = await mergedPdf.save();
    const outputPath = path.join(path.dirname(files[0]), 'merged.pdf');
    fs.writeFileSync(outputPath, mergedPdfBytes);
    return outputPath;
});

ipcMain.handle('split-pdf', async (event, file) => {
    const pdfBytes = fs.readFileSync(file);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true }); // Ignora a criptografia
    const pdfPages = pdf.getPages();
    const outputFiles = [];
    for (let i = 0; i < pdfPages.length; i++) {
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdf, [i]);
        singlePagePdf.addPage(copiedPage);
        const singlePageBytes = await singlePagePdf.save();
        const outputPath = path.join(path.dirname(file), `page_${i + 1}.pdf`);
        fs.writeFileSync(outputPath, singlePageBytes);
        outputFiles.push(outputPath);
    }
    return outputFiles;
});

ipcMain.handle('process-ordered-pdfs', async (event, orderedFiles) => {
    if (orderedFiles.length === 0) {
        throw new Error('Nenhum arquivo foi fornecido para processar.');
    }
    const orderedPdf = await PDFDocument.create();
    for (const file of orderedFiles) {
        const pdfBytes = fs.readFileSync(file);
        const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true }); // Ignora a criptografia
        const copiedPages = await orderedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => orderedPdf.addPage(page));
    }
    const orderedPdfBytes = await orderedPdf.save();
    const outputPath = path.join(path.dirname(orderedFiles[0]), 'ordered.pdf');
    fs.writeFileSync(outputPath, orderedPdfBytes);
    return outputPath;
});
