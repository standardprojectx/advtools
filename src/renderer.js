function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

async function convertFiles(conversionType) {
    let files = [];
    let fileInputId = '';

    if (conversionType === 'imageToPdf') {
        files = Array.from(document.getElementById('imageInput').files).map(file => file.path);
        fileInputId = 'imageInput';
    } else if (conversionType === 'audioVideo') {
        files = Array.from(document.getElementById('audioVideoInput').files).map(file => file.path);
        conversionType = document.getElementById('audioVideoConversionSelect').value;
        fileInputId = 'audioVideoInput';
    } else {
        return;
    }

    if (files.length === 0) {
        alert('Por favor, selecione pelo menos um arquivo para converter.');
        return;
    }

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    window.electron.onProgress((progress) => {
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}%`;
    });

    try {
        const result = await window.electron.convertFiles(files, conversionType);
        const resultList = document.getElementById('result');
        resultList.innerHTML = '';
        result.forEach(file => {
            const listItem = document.createElement('li');
            listItem.textContent = `Converted: ${file}`;
            resultList.appendChild(listItem);
        });
        progressContainer.style.display = 'none';
        document.getElementById(fileInputId).value = ''; // Limpa o campo de seleção de arquivo
    } catch (error) {
        console.error('Erro ao converter arquivos:', error);
        progressContainer.style.display = 'none';
    }
}

function handlePdfFiles() {
    const files = Array.from(document.getElementById('pdfInput').files).map(file => file.path);
    if (files.length === 0) {
        alert('Por favor, selecione pelo menos um arquivo PDF.');
        return;
    }
    // Adicione a lógica específica para lidar com arquivos PDF
    console.log(files);
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('imageSection');
});
