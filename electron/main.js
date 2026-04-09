const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron')
const path = require('path')

const VERCEL_URL = 'https://jatry006.vercel.app'

let mainWindow
let tray
let isQuitting = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 800,
    minHeight: 600,
    title: 'Jatry',
    backgroundColor: '#0a0b0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  })

  mainWindow.loadURL(VERCEL_URL)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 외부 링크는 브라우저로
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // X 버튼 → 트레이로 숨기기 (카톡처럼)
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('Jatry')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Jatry 열기',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // 트레이 아이콘 클릭 → 창 토글
  tray.on('click', () => {
    if (!mainWindow) { createWindow(); return }
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // 더블클릭도 지원
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()
})

// 모든 창 닫혀도 앱 유지 (트레이 상주)
app.on('window-all-closed', () => {
  // 종료하지 않음 — 트레이에 남아있음
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})
