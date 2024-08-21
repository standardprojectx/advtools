function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
  
  
    const buttons = document.querySelectorAll('.menu button');
    buttons.forEach(button => {
      button.classList.remove('active');
    });
    document.querySelector(`button[onclick="showSection('${sectionId}')"]`).classList.add('active');
  }
  

  function clearResults() {
    const resultList = document.getElementById('result');
    resultList.innerHTML = '';

    // Limpar a lista de PDFs arrastados
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';

    // Opcionalmente, você pode limpar também o campo de entrada de arquivos PDF
    document.getElementById('pdfInput').value = '';
}


function handlePdfAction() {
    const action = document.getElementById('pdfActionSelect').value;
    if (action === 'mergePdfs') {
      mergePdfs();
    } else if (action === 'splitPdf') {
      splitPdf();
    } else {
      alert('Por favor, selecione uma ação válida.');
    }
  }
  

async function convertFiles(conversionType) {
    let files = [];
    let fileInputId = '';

    if (conversionType === 'imageToPdf') {
        files = Array.from(document.getElementById('imageInput').files).map(file => file.path);
        fileInputId = 'imageInput';
    } else if (conversionType === 'audio') {
        files = Array.from(document.getElementById('audioInput').files).map(file => file.path);
        conversionType = document.getElementById('audioConversionSelect').value;
        fileInputId = 'audioInput';
    } else if (conversionType === 'video') {
        files = Array.from(document.getElementById('videoInput').files).map(file => file.path);
        conversionType = document.getElementById('videoConversionSelect').value;
        fileInputId = 'videoInput';
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
        document.getElementById('pdfList').innerHTML = ''; // Limpa a área de ordenação
    } catch (error) {
        console.error('Erro ao converter arquivos:', error);
        progressContainer.style.display = 'none';
    }
}

function handlePdfFiles() {
    const files = Array.from(document.getElementById('pdfInput').files);
    if (files.length === 0) {
        alert('Por favor, selecione pelo menos um arquivo PDF.');
        return;
    }

    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';

    files.forEach(file => {
        const listItem = document.createElement('li');
        listItem.textContent = file.name;
        listItem.draggable = true;
        listItem.filePath = file.path;
        listItem.addEventListener('dragstart', handleDragStart);
        listItem.addEventListener('dragover', handleDragOver);
        listItem.addEventListener('drop', handleDrop);
        listItem.addEventListener('dragend', handleDragEnd);
        pdfList.appendChild(listItem);
    });
}

function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.filePath);
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const draggingItem = document.querySelector('.dragging');
    const overItem = e.target;
    if (overItem.tagName !== 'LI') return;
    const parent = overItem.parentNode;
    const items = Array.from(parent.children);
    const draggingIndex = items.indexOf(draggingItem);
    const overIndex = items.indexOf(overItem);

    if (draggingIndex < overIndex) {
        parent.insertBefore(draggingItem, overItem.nextSibling);
    } else {
        parent.insertBefore(draggingItem, overItem);
    }
}


function toggleTheme() {
    const body = document.body;
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    body.classList.toggle('dark-mode');

    if (body.classList.contains('dark-mode')) {
        themeToggleBtn.textContent = '☀️';
    } else {
        themeToggleBtn.textContent = '🌙';
    }
}


function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function processPdfOrder() {
    const pdfList = Array.from(document.getElementById('pdfList').children);
    const orderedFiles = pdfList.map(item => item.filePath);

    window.electron.processOrderedPdfs(orderedFiles).then((outputPath) => {
        const resultList = document.getElementById('result');
        resultList.innerHTML = `<li>Ordered PDF: ${outputPath}</li>`;
            }).catch((error) => {
        console.error('Erro ao processar ordem dos PDFs:', error);
    });
}

async function mergePdfs() {
    const files = Array.from(document.getElementById('pdfInput').files).map(file => file.path);
    if (files.length === 0) {
        alert('Por favor, selecione pelo menos um arquivo PDF.');
        return;
    }

    try {
        const result = await window.electron.mergePdfs(files);
        const resultList = document.getElementById('result');
        resultList.innerHTML = '';
        resultList.innerHTML = `<li>Juntado: ${result}</li>`;
    } catch (error) {
        console.error('Erro ao juntar PDFs:', error);
    }
}

async function splitPdf() {
    const files = Array.from(document.getElementById('pdfInput').files).map(file => file.path);
    if (files.length === 0) {
        alert('Por favor, selecione pelo menos um arquivo PDF.');
        return;
    }

    try {
        const results = await window.electron.splitPdf(files[0]); // Suporte apenas para um arquivo por vez
        const resultList = document.getElementById('result');
        resultList.innerHTML = '';
        results.forEach((file, index) => {
            resultList.innerHTML += `<li>Separado: ${file}</li>`;
        });
    } catch (error) {
        console.error('Erro ao separar PDF:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pdfInput').addEventListener('change', handlePdfFiles);
    showSection('imageSection');
});
