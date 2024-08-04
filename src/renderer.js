document.getElementById('convertButton').addEventListener('click', async () => {
    const conversionSelect = document.getElementById('conversionSelect');
    const conversionType = conversionSelect.value;
    console.log(conversionType);

    await convertFiles(conversionType);
});

async function convertFiles(conversionType) {
    const fileInput = document.getElementById('fileInput');
    const files = Array.from(fileInput.files).map(file => file.path);
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
        fileInput.value = ''; // Limpa o campo de seleção de arquivo
    } catch (error) {
        console.error('Erro ao converter arquivos:', error);
        progressContainer.style.display = 'none';
    }
}
