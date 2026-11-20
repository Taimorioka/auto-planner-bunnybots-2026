const canvas = document.getElementById('fieldCanvas');
const ctx = canvas.getContext('2d');

const fieldImage = new Image();
fieldImage.src = 'field.png';

fieldImage.onload = () => {
    canvas.width = fieldImage.naturalWidth;
    canvas.height = fieldImage.naturalHeight;

    ctx.drawImage(fieldImage, 0, 0);
};

fieldImage.onerror = () => {
    console.error("Error loading field.png. Check that the file exists and is named correctly.");
};