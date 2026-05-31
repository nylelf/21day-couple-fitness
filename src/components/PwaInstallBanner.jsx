import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "./ui";
import {
  dismissInstallPrompt,
  isAndroidChrome,
  isIosSafari,
  isStandaloneDisplay,
  wasInstallPromptDismissed,
} from "../pwaInstall";

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay() || wasInstallPromptDismissed()) return;

    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
      setIosHint(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
    } else if (isAndroidChrome()) {
      const timer = window.setTimeout(() => {
        if (!isStandaloneDisplay() && !wasInstallPromptDismissed()) {
          setVisible(true);
        }
      }, 1200);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  function closeBanner() {
    dismissInstallPrompt();
    setVisible(false);
    setDeferredPrompt(null);
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    closeBanner();
  }

  if (!visible) return null;

  return (
    <div className="pwa-install-banner">
      <button type="button" className="pwa-install-close" aria-label="关闭" onClick={closeBanner}>
        <X size={16} />
      </button>
      <div className="pwa-install-title">
        <Download size={18} />
        添加到主屏幕
      </div>
      {iosHint ? (
        <p className="pwa-install-text">
          在 Safari 中点击底部 <Share2 size={14} className="pwa-inline-icon" />「分享」，再选择「添加到主屏幕」，即可像 App 一样打开。
        </p>
      ) : deferredPrompt ? (
        <>
          <p className="pwa-install-text">安装到手机桌面，打卡更方便，全屏体验更接近 App。</p>
          <Button className="primary-btn full-btn pwa-install-btn" onClick={handleInstallClick}>
            立即安装
          </Button>
        </>
      ) : (
        <p className="pwa-install-text">
          在浏览器菜单中选择「添加到主屏幕」或「安装应用」，即可像 App 一样使用。
        </p>
      )}
    </div>
  );
}
