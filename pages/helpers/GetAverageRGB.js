// Get Image Domainant Color

export const getAverageRGB = async (imgEl) => {

    // console.log("getAverageRGB Called Once");
    
    var blockSize = 5; // only visit every 5 pixels
                       // I think this is enough not to oveload it, but we can try it out and test performance,
        var defaultRGB = { r: 0, g: 0, b: 0 }; // for non-supporting envs
        var canvas = document.createElement("canvas");
        var context = canvas.getContext && canvas.getContext("2d");
        var data;
        var width;
        var height;
        var i = -4;
        var length;
        var rgb = { r: 0, g: 0, b: 0 };
        var count = 0;

    if (!context) {
        return defaultRGB;
    }

    height = canvas.height =
        imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
    width = canvas.width =
        imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;

    context.drawImage(imgEl, 0, 0);

    try {
        data = context.getImageData(0, 0, width, height);
    } catch (e) {
        /* security error, img on diff domain */ alert("x");
        return defaultRGB;
    }

    length = data.data.length;

    while ((i += blockSize * 4) < length) {
        ++count;
        rgb.r += data.data[i];
        rgb.g += data.data[i + 1];
        rgb.b += data.data[i + 2];
    }

    // ~~ used to floor values
    rgb.r = ~~(rgb.r / count);
    rgb.g = ~~(rgb.g / count);
    rgb.b = ~~(rgb.b / count);

    return rgb;
};