import { app, BrowserWindow, nativeTheme } from "electron";
import path from "path";
import os from "os";

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const flowfile = "flows.json";
const listenPort = "80";
const url = "/admin";
const urledit = "/admin";

try {
  if (platform === "win32" && nativeTheme.shouldUseDarkColors === true) {
    require("fs").unlinkSync(
      path.join(app.getPath("userData"), "DevTools Extensions")
    );
  }
} catch {}

let mainWindow;

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, "icons/icon.png"), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      devTools: true,
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
    },
  });

  // setInterval(() => {
  //   // 这里有个node-red和electron的神奇bug，require node-red 后 devtools 不能立即启动，必须用这种延迟的方式
  //   mainWindow.loadURL(process.env.APP_URL);
  // }, 5000);

  mainWindow.on("ready-to-show", () => {
    if (!mainWindow) {
      throw new Error("mainWindow is not defined");
    }
    mainWindow.webContents.openDevTools();
  });

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    console.log(`production不打开`);
    // we're on production; no access to devtools pls
    // mainWindow.webContents.on("devtools-opened", () => {
    //   mainWindow.webContents.closeDevTools();
    // });
  }
  let webContents = mainWindow.webContents;
  webContents.on(
    "did-get-response-details",
    function (event, status, newURL, originalURL, httpResponseCode) {
      if (
        httpResponseCode == 404 &&
        newURL == "http://localhost:" + listenPort + url
      ) {
        setTimeout(webContents.reload, 200);
      }
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
  );

  mainWindow.webContents.on(
    "new-window",
    function (e, url, frameName, disposition, options) {
      // if a child window opens... modify any other options such as width/height, etc
      // in this case make the child overlap the parent exactly...
      var w = mainWindow.getBounds();
      options.x = w.x;
      options.y = w.y;
      options.width = w.width;
      options.height = w.height;
      //re-use the same child name so all "2nd" windows use the same one.
      //frameName = "child";
    }
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

let http = require("http");
let express = require("express");
let RED = require("node-red");

let red_app = express();
let server = http.createServer(red_app);

let userdir;
// if (process.argv[1] && process.argv[1] === "main.js") {
//   userdir = __dirname;
// } else {
//   const fs = require("fs");
//   userdir = os.homedir() + "/.node-red";
// }
if (process.argv[2]?.indexOf("electron-main.js")) {
  // 开发环境
  userdir = path.resolve(process.execPath, "../../../../public/.node-red");
} else {
  // 打包环境
  userdir = path.resolve(process.execPath, "../resources/app/.node-red");
}
console.log("Setting UserDir to ", userdir);

let settings = {
  verbose: true,
  httpAdminRoot: "/admin",
  httpNodeRoot: "/",
  // 使用指定的用户目录 | use specified user directory
  userDir: userdir,
  // 不知道是啥，red.js源码中没找到，大概是flowFile的文件名
  flowFile: flowfile,
  functionGlobalContext: {}, // enables global context
  editorTheme: { projects: { enabled: true } },
};

RED.init(server, settings);

red_app.use(settings.httpAdminRoot, RED.httpAdmin);
red_app.use(settings.httpNodeRoot, RED.httpNode);

var template = [
  {
    label: "Application",
    submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }],
  },
  {
    label: "Node-RED",
    submenu: [
      //{ label: 'Dashboard',
      //accelerator: "Shift+CmdOrCtrl+D",
      //click() { mainWindow.loadURL("http://localhost:"+listenPort+url); }
      //},
      //{ label: 'Editor',
      //accelerator: "Shift+CmdOrCtrl+E",
      //click() { mainWindow.loadURL("http://localhost:"+listenPort+urledit); }
      //},
      //{ type: 'separator' },
      {
        label: "Documentation",
        click() {
          require("electron").shell.openExternal("http://nodered.org/docs");
        },
      },
      {
        label: "Flows and Nodes",
        click() {
          require("electron").shell.openExternal("http://flows.nodered.org");
        },
      },
      {
        label: "Google group",
        click() {
          require("electron").shell.openExternal(
            "https://groups.google.com/forum/#!forum/node-red"
          );
        },
      },
    ],
  },
  {
    //label: "Edit",
    //submenu: [
    //    { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
    //    { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
    //    { type: "separator" },
    //    { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
    //    { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
    //    { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
    //    { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    //]}, {
    label: "View",
    submenu: [
      {
        label: "Reload",
        accelerator: "CmdOrCtrl+R",
        click(item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload();
        },
      },
      //{ label: 'Toggle Developer Tools',
      //    accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
      //    click(item, focusedWindow) { if (focusedWindow) focusedWindow.webContents.toggleDevTools(); }
      //},
      { type: "separator" },
      { role: "resetzoom" },
      { role: "zoomin" },
      { role: "zoomout" },
      //{ type: 'separator' },
      //{ role: 'togglefullscreen' },
      //{ role: 'minimize' }
    ],
  },
];

RED.start().then(function () {
  server.listen(listenPort, "127.0.0.1", function () {
    mainWindow.loadURL("http://127.0.0.1:" + listenPort + url);
  });
});
