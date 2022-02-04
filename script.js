const video = document.getElementById("video");
const playButton = document.getElementById("play");

let predictedAges = [];
const synth = window.speechSynthesis;
let voices = synth.getVoices();
let utter = new SpeechSynthesisUtterance();

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  faceapi.nets.ageGenderNet.loadFromUri("/models"),
]).then(startVideo);

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    (stream) => (video.srcObject = stream),
    (err) => console.error(err)
  );
}

let currentExpression = "neutral";

video.addEventListener("playing", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    const age = resizedDetections[0].age;
    const interpolatedAge = interpolateAgePredictions(age);
    const bottomRight = {
      x: resizedDetections[0].detection.box.bottomRight.x - 50,
      y: resizedDetections[0].detection.box.bottomRight.y,
    };

    new faceapi.draw.DrawTextField(
      [`${faceapi.round(interpolatedAge, 0)} years`],
      bottomRight
    ).draw(canvas);

    let expressionsObj = resizedDetections[0].expressions;
    let highestValue = 0;
    let highestExpression = "";
    Object.entries(expressionsObj).map((obj, index) => {
      if (highestValue < obj[1]) {
        highestValue = obj[1];
        highestExpression = obj[0];
      }
    });
    currentExpression = highestExpression;
  }, 1000);
});

playButton.addEventListener("click", (evt) => {
  evt.stopPropagation();
  speech(currentExpression);
});

function interpolateAgePredictions(age) {
  predictedAges = [age].concat(predictedAges).slice(0, 30);
  const avgPredictedAge =
    predictedAges.reduce((total, a) => total + a) / predictedAges.length;
  return avgPredictedAge;
}

function speech(emotion) {
  utter.text = emotion;
  utter.voice = voices[0];
  synth.speak(utter);
}
