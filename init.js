const sharp = require("sharp");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const GIFEncoder = require("gifencoder");
const { createCanvas, loadImage } = require("canvas");

const puppeteer = require("puppeteer");
const GIF = require("gif.js");

const ffmpeg = require("fluent-ffmpeg");
const { rejects } = require("assert");

// URL of the image you want to download and split
const imageUrl =
  "https://zalo-api.zadn.vn/api/emoticon/sprite?eid=45350&size=130"; // Replace with the actual URL

// Output directory where the four 50x50 images will be saved
const outputDirectory = "output/";

// Ensure the output directory exists
fs.mkdirSync(outputDirectory, { recursive: true });

const sizeImage = 130;

const handleImageProgress = (id) => {
  return axios
    .get(`https://zalo-api.zadn.vn/api/emoticon/sprite?eid=${id}&size=130`, {
      responseType: "stream",
    })
    .then((response) => {
      const outputStream = fs.createWriteStream(
        path.join(outputDirectory, "output.png")
      );

      // Pipe the response stream directly to sharp for processing
      response.data.pipe(sharp()).pipe(outputStream);

      return new Promise((resolve, reject) => {
        outputStream.on("finish", resolve);
        outputStream.on("error", reject);
      });
    })
    .then(() => {
      return sharp(path.join(outputDirectory, "output.png"))
        .toFormat("png")
        .toBuffer();
    })
    .then(async (data) => {
      console.log("Image processed successfully.");
      const image = await sharp(`${outputDirectory}output.png`);

      let metaData = await image.metadata();
      console.log("#>>>>>>", metaData.width, metaData.height);
      numberImg = metaData.width / sizeImage;

      let coordinates = [];
      for (let i = 0; i < numberImg; i++) {
        coordinates.push({ x: i * sizeImage, y: 0 });
      }

      let count = 0;

      // Create a new image for each coordinate.
      for (const coordinate of coordinates) {
        const outputImage = await image.clone().extract({
          left: coordinate.x,
          top: coordinate.y,
          width: sizeImage,
          height: sizeImage,
        });

        // Save the output image.
        await outputImage.toFile(`${outputDirectory}img_${count}.png`);
        count++;
      }

      let inputImages = [];
      for (let i = 0; i < numberImg; i++) {
        inputImages.push(`${outputDirectory}img_${i}.png`);
      }
      inputImages.push(`${outputDirectory}palette.png`);

      // create gif
      // const outputGifFile = `${outputDirectory}img_gif_${id}.gif`;

      // const outputStream = fs.createWriteStream(outputGifFile);
      // const encoder = new GIFEncoder(sizeImage, sizeImage);
      // encoder.createReadStream().pipe(outputStream);
      // encoder.start();
      // encoder.setRepeat(0); // 0 for repeat indefinitely
      // encoder.setDelay(100);

      // const canvas = createCanvas(sizeImage, sizeImage);

      // const ctx = canvas.getContext("2d");
      // ctx.fillStyle = "#ffffff";

      // for (const imagePath of inputImages) {
      //   const image = await loadImage(imagePath);
      //   ctx.clearRect(0, 0, sizeImage, sizeImage);
      //   ctx.fillRect(0, 0, sizeImage, sizeImage);
      //   ctx.drawImage(image, 0, 0, sizeImage, sizeImage);

      //   // const frameBuffer = canvas.toBuffer('image/gif');

      //   encoder.addFrame(ctx);
      // }

      // encoder.finish(); // Finish creating the GIF

      await handleToGif();

      for (let i = 0; i < inputImages.length; i++) {
        fs.unlinkSync(inputImages[i]);
      }
      fs.unlinkSync(`${outputDirectory}output.png`);
    })
    .catch((err) => {
      console.error("Error:", err);
    });
};

let numberImg = 13;
// ami 1
// const minId = 43516;
// const maxId = 43531;

// ami 2
// const minId = 43548;
// const maxId = 43563;

// ami 3
// const minId = 45341;
// const maxId = 45356;

// ami 4
// const minId = 45377;
// const maxId = 45388;

// ami 5
const minId = 45417;
const maxId = 45428;

// const minId = 45417;
// const maxId = 45417;

let id = minId;

const loadimg = async () => {
  console.log("HANDLER ID: ", id);
  await handleImageProgress(id);
  id++;
  if (id > maxId) {
    return;
  }
  loadimg();
};

loadimg();

const handleToGif = async () => {
  // ffmpeg()
  //   .input(`${outputDirectory}img_%d.png`)
  //   .output(`${outputDirectory}ooo.gif`)
  //   .toFormat("gif")
  //   .on("end", () => {
  //     console.log(`GIF image created: ${outputDirectory}ooo.gif`);
  //   })
  //   .on("error", (err) => {
  //     console.error("Error:", err);
  //   })
  //   .run();
  return new Promise((resolve, rejects) => {
    const ffmpegCommand = `ffmpeg -i ${outputDirectory}img_%d.png -vf palettegen=reserve_transparent=1 ${outputDirectory}palette.png`;
    const ffmpegCommand2 = `ffmpeg -framerate 10 -i ${outputDirectory}img_%d.png -i ${outputDirectory}palette.png -lavfi paletteuse=alpha_threshold=128 -gifflags -offsetting ${outputDirectory}img_gif_${id}.gif`;
    exec(ffmpegCommand, (error, stdout, stderr) => {
      console.log("#>>>>>stdout", stdout, stderr);
      if (error) {
        console.error("Error:", error);
        rejects(error);
        return;
      }
      exec(ffmpegCommand2, (error, stdout, stderr) => {
        if (error) {
          console.error("Error2:", error);
          rejects(error);
          return;
        }
        resolve();
        console.log("FFmpeg2 command executed successfully");
      });
      console.log("FFmpeg command executed successfully");
    });
  });
};
