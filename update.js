import { readFile, writeFile } from "fs/promises";

const match_text = await readFile("./raw_matches.json", "utf8");
const raw_matches = (JSON.parse(match_text))["Matches"];

const schedule_text = await readFile("./raw_schedule.json", "utf8");
const raw_schedule = JSON.parse(schedule_text);

console.log(raw_matches);
const matches = [];
for (const raw_match of raw_schedule["Schedule"]) {
  let match = {};
  match["name"] = raw_match["description"];
  match["red1"] = raw_match["teams"][0]["teamNumber"];
  match["red2"] = raw_match["teams"][1]["teamNumber"];
  match["red3"] = raw_match["teams"][2]["teamNumber"];
  match["blue1"] = raw_match["teams"][3]["teamNumber"];
  match["blue2"] = raw_match["teams"][4]["teamNumber"];
  match["blue3"] = raw_match["teams"][5]["teamNumber"];

  match["redScore"] = -1;
  match["blueScore"] = -1;

  match["redScorePred"] = -1;
  match["blueScorePred"] = -1;

  match["winningAlliance"] = null;
  match["winPercentage"] = -1;

  matches.push(match);
}

// Approximation of the error function
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// Returns win probability (0-100)
function winProbability(predictedMargin, stdDev) {
  const z = predictedMargin / stdDev;
  const probability = 0.5 * (1 + erf(z / Math.sqrt(2)));
  return probability * 100;
}

const team_text = await readFile("./teams.json", "utf8");
let numberToEPA = JSON.parse(team_text);

for (let i = 0; i < matches.length; i++) {
  if (!numberToEPA[matches[i]["red1"]]) {
    numberToEPA[matches[i]["red1"]] = 0;
  }
  if (!numberToEPA[matches[i]["red2"]]) {
    numberToEPA[matches[i]["red2"]] = 0;
  }
  if (!numberToEPA[matches[i]["red3"]]) {
    numberToEPA[matches[i]["red3"]] = 0;
  }
  if (!numberToEPA[matches[i]["blue1"]]) {
    numberToEPA[matches[i]["blue1"]] = 0;
  }
  if (!numberToEPA[matches[i]["blue2"]]) {
    numberToEPA[matches[i]["blue2"]] = 0;
  }
  if (!numberToEPA[matches[i]["blue3"]]) {
    numberToEPA[matches[i]["blue3"]] = 0;
  }

  matches[i]["redScorePred"] =
    numberToEPA[matches[i]["red1"]] +
    numberToEPA[matches[i]["red2"]] +
    numberToEPA[matches[i]["red3"]];
  matches[i]["blueScorePred"] =
    numberToEPA[matches[i]["blue1"]] +
    numberToEPA[matches[i]["blue2"]] +
    numberToEPA[matches[i]["blue3"]];

  if (matches[i]["redScorePred"] > matches[i]["blueScorePred"]) {
    matches[i]["winningAlliance"] = "red";
  } else if (matches[i]["redScorePred"] < matches[i]["blueScorePred"]) {
    matches[i]["winningAlliance"] = "blue";
  } else {
    matches[i]["winningAlliance"] = "tie";
  }

  const predictedMargin = Math.abs(
    matches[i]["redScorePred"] - matches[i]["blueScorePred"],
  );
  const stdDev = 80;

  matches[i]["winPercentage"] = winProbability(predictedMargin, stdDev);

  if (i < raw_matches.length) {

    let redPreFoulScore = raw_matches[i]["scoreRedFinal"] - raw_matches[i]["scoreRedFoul"]
    let bluePreFoulScore = raw_matches[i]["scoreBlueFinal"] - raw_matches[i]["scoreBlueFoul"]


    matches[i]["redScore"] = raw_matches[i]["scoreRedFinal"]
    matches[i]["blueScore"] = raw_matches[i]["scoreBlueFinal"]

    let redMargin = matches[i]["redScorePred"] - redPreFoulScore;
    let blueMargin = matches[i]["blueScorePred"] - bluePreFoulScore;

    console.log(redMargin)

    numberToEPA[matches[i]["red1"]] -= redMargin * 0.3
    numberToEPA[matches[i]["red2"]] -= redMargin * 0.3
    numberToEPA[matches[i]["red3"]] -= redMargin * 0.3

    numberToEPA[matches[i]["blue1"]] -= blueMargin * 0.3;
    numberToEPA[matches[i]["blue2"]] -= blueMargin * 0.3;
    numberToEPA[matches[i]["blue3"]] -= blueMargin * 0.3;

  } 
}
console.log(raw_matches.length);

await writeFile("./matches.json", JSON.stringify(matches, null, 2), "utf8");
await writeFile("./teams.json", JSON.stringify(numberToEPA, null, 2), "utf8");
