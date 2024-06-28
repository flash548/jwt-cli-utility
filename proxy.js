"use strict";

function runUtil() {
  const httpProxy = require("http-proxy");
  const jwt = require("jwt-simple");
  const fs = require("fs");
  const nopt = require("nopt"),
    knownOpts = {
      cookie: String,
      silent: Boolean,
      jwt: String,
      namespace: String,
      delay: Number,
    },
    shortHands = {},
    parsedArgs = nopt(knownOpts, shortHands, process.argv, 2);
  const blessed = require("blessed");
  const args = parsedArgs.argv.remain;
  const cwd = __dirname;
  let consoleBuffer = "";
  let consoleTextArea = null;
  let screen = null;

  // get list of the token files (.jwt files)
  const tokens = fs
    .readdirSync(cwd)
    .filter((item) => item !== "." && item !== ".." && item.match(/\.jwt$/));

  // get list of namespaces (app names from namespaces.txt file)
  const namespaces = fs
    .readFileSync(cwd + "/namespaces.txt")
    .toString()
    .split("\n")
    .filter((name) => name !== "");

  const tokenFound = tokens.includes(parsedArgs.jwt);
  if (parsedArgs.silent && tokenFound && !fs.existsSync(parsedArgs.jwt)) {
    console.error(`Cannot find file ${parsedArgs.jwt}`);
    process.exit(1);
  }
  var jwtToken =
    parsedArgs.silent && tokenFound && parsedArgs.jwt != "none"
      ? parsedArgs.jwt
      : null;
  var namespace = parsedArgs.silent
    ? parsedArgs.namespace == "none"
      ? null
      : parsedArgs.namespace || null
    : "none";

  // make the GUI if we're not running in silent
  if (!parsedArgs.silent) {
    screen = blessed.screen({
      smartCSR: true,
    });

    blessed.text({
      parent: screen,
      shrink: true,
      top: 1,
      left: 1,
      label:
        "Listening on: " +
        (args[0] || 9000) +
        " / proxying to: " +
        (args[1] || 8080),
    });

    blessed.text({
      parent: screen,
      shrink: true,
      top: 2,
      left: 1,
      label: "Press q to quit",
    });

    const form = blessed.form({
      parent: screen,
      keys: true,
      left: 0,
      top: 0,
      shrink: true,
      width: 50,
      content: "Proxy Util",
      padding: {
        left: 1,
        right: 2,
      },
      border: {
        type: "line",
        fg: "blue",
        bold: true,
      },
      fg: "green",
    });

    const jwtRadioSet = blessed.radioset({
      parent: form,
      keys: true,
      left: 1,
      top: 2,
      shrink: true,
      content: "Choose JWT Token:",
    });

    const noneJwt = blessed.radiobutton({
      parent: jwtRadioSet,
      top: 1,
      left: 1,
      shrink: true,
      text: "None",
      checked: true,
      mouse: true,
    });

    noneJwt.on("check", () => {
      jwtToken = jwtToken = null;
    });

    var tokenCount = 2;
    const tokenButtons = tokens.map((name) =>
      blessed.radiobutton({
        parent: jwtRadioSet,
        top: tokenCount++,
        left: 1,
        shrink: true,
        text: name,
        checked: false,
        mouse: true,
      })
    );

    tokenButtons.forEach((btn) => {
      btn.on("check", () => {
        jwtToken = btn.text;
      });
    });

    const namespaceRadioSet = blessed.radioset({
      parent: form,
      keys: true,
      top: tokenCount + 2,
      left: 1,
      shrink: true,
      content: "Choose App Name:",
    });

    const noneNamespace = blessed.radiobutton({
      parent: namespaceRadioSet,
      top: 1,
      left: 1,
      shrink: true,
      text: "None",
      checked: true,
      mouse: true,
    });

    noneNamespace.on("check", () => {
      namespace = null;
    });

    var nameCount = 2;
    const namespaceButtons = namespaces.map((name) =>
      blessed.radiobutton({
        parent: namespaceRadioSet,
        top: nameCount++,
        left: 1,
        shrink: true,
        text: name,
        checked: false,
        mouse: true,
      })
    );

    namespaceButtons.forEach((nsBtn) => {
      nsBtn.on("check", () => {
        namespace = nsBtn.text.toLowerCase() == "none" ? null : nsBtn.text;
      });
    });

    blessed.text({
      parent: form,
      shrink: true,
      top: tokenCount + nameCount + 10,
      left: 1,
      label:
        "Listen on: " + (args[0] || 9000) + " / proxy to: " + (args[1] || 8080),
    });

    const cancel = blessed.button({
      parent: form,
      mouse: true,
      keys: true,
      shrink: true,
      padding: {
        left: 1,
        right: 1,
      },
      top: tokenCount + nameCount + 10,
      right: 1,
      shrink: true,
      name: "quit",
      content: "Quit",
      style: {
        bg: "blue",
        focus: {
          bg: "red",
        },
        hover: {
          bg: "red",
        },
      },
    });

    cancel.on("press", function () {
      process.exit(0);
    });

    screen.key("q", function () {
      process.exit(0);
    });

    const consoleForm = blessed.form({
      parent: screen,
      keys: true,
      left: 0 + form.width,
      top: 0,
      shrink: true,
      width: "50%",
      height: form.height,
      content: "Console",
      padding: {
        left: 1,
        right: 2,
      },
      border: {
        type: "line",
        fg: "blue",
        bold: true,
      },
      fg: "green",
    });

    consoleTextArea = blessed.textarea({
      parent: consoleForm,
      keys: true,
      mouse: true,
      inputOnFocus: true,
      scrollable: true,
      scrollbar: {
        bg: "blue",
        track: true,
      },
      left: 0,
      top: 2,
      fg: "green",
      border: {
        type: "line",
        fg: "blue",
        bold: true,
      },
    });

    screen.render();
  }

  // set up proxy - default to sending requests to port 8080
  const proxy = httpProxy.createProxyServer({
    secure: false,
    target:
      (process.env.REAL_PROXY_URL || "http://localhost") +
      ":" +
      (args[1] || 8080),
  });

  // inject the P1 headers and auth token
  proxy.on("proxyReq", function (proxyReq, req, res, options) {
    // this header is the JWT from Keyclock/istio
    if (jwtToken) {
      var tokenContents = jwt.encode(
        JSON.parse(fs.readFileSync(cwd + "/" + jwtToken)),
        "!@QWASZX123qwaszx",
        "HS256"
      );
      proxyReq.setHeader("Authorization", "Bearer " + tokenContents);
    }

    if (parsedArgs.cookie) {
      proxyReq.setHeader("Cookie", parsedArgs.cookie);
      consoleBuffer += `Cookie: ${parsedArgs.cookie}\n`;
    }

    // this header is used for app-to-app in-cluster comms using cluster FQDNs
    if (namespace) {
      proxyReq.setHeader(
        "x-forwarded-client-cert",
        `By=spiffe://cluster.local/ns/common-api/sa/default;Hash=blah;Subject="";URI=spiffe://cluster.local/ns/${namespace}/sa/default`
      );
    }
    consoleBuffer += "\n----- REQUEST ----\n";

    const headers = proxyReq.getHeaders();
    Object.keys(headers).forEach((item) => {
      consoleBuffer += `${item}: ${headers[item]}\n`;
    });
    consoleBuffer += `URL: ${req.url}\n`;
    consoleBuffer += `METHOD: ${req.method}\n`;
    if (!parsedArgs.silent) {
      consoleTextArea.setValue(consoleBuffer);
      screen.render();
    } else {
      if (
        !Object.keys(proxyReq.getHeaders())
          .filter((x) => x.toLowerCase())
          .includes("authorization")
      ) {
        console.log(req.url + " " + req.method);
      }
    }
  });

  proxy.on("proxyRes", function (proxyRes, req, res) {
    var body = [];
    proxyRes.on("data", function (data) {
      body.push(data.toString());
      consoleBuffer += body.toString();
      if (!parsedArgs.silent) {
        consoleTextArea.setValue(consoleBuffer);
        screen.render();
      }
    });
    consoleBuffer += `----- RESPONSE -----\nResponse Status: ${
      proxyRes.statusCode
    }\nResponse Headers:\n${JSON.stringify(
      proxyRes.headers,
      true,
      2
    )}\nResponse Body:\n`;
    if (!parsedArgs.silent) {
      consoleTextArea.setValue(consoleBuffer);
      screen.render();
    }
    proxyRes.on("end", function () {
      if (parsedArgs.delay) {
        setTimeout(() => res.end(body), Number(parsedArgs.delay));
      }
      if (!parsedArgs.silent) {
        consoleBuffer += '\n';
        consoleTextArea.setValue(consoleBuffer);
        screen.render();
      }
    });
  });

  // handle errors so we don't crash out, just return a 500 error
  proxy.on("error", function (err, req, res) {
    console.log("Error: " + err);
    res.writeHead(500, {
      "Content-Type": "text/plain",
    });
    res.end(
      "Something went wrong. Unable to proxy request. Check destination status. " +
        err
    );
  });

  proxy.listen(Number(args[0]));
}

module.exports = runUtil;

// if not using this as a lib, run it so we get a GUI
if (require.main === module) runUtil();
