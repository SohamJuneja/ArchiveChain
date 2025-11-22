const button = document.getElementById("archive-btn");
const statusEl = document.getElementById("status");
const publicModeBtn = document.getElementById("public-mode");
const sealedModeBtn = document.getElementById("sealed-mode");
const sealPanel = document.getElementById("seal-panel");
const recipientKeyInput = document.getElementById("recipient-key");

let isWhistleblowerMode = false;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#fca5a5" : "#a5b4fc";
}

// Mode toggle handlers
publicModeBtn.addEventListener("click", () => {
  isWhistleblowerMode = false;
  publicModeBtn.classList.add("active");
  sealedModeBtn.classList.remove("active");
  sealPanel.classList.remove("active");
  button.textContent = "Archive this page";
});

sealedModeBtn.addEventListener("click", () => {
  isWhistleblowerMode = true;
  sealedModeBtn.classList.add("active");
  publicModeBtn.classList.remove("active");
  sealPanel.classList.add("active");
  button.textContent = "🔒 Seal & Archive";
});

button.addEventListener("click", () => {
  button.disabled = true;
  setStatus("Reading current tab…");

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) {
      setStatus("Could not read active tab URL.", true);
      button.disabled = false;
      return;
    }

    const url = tab.url;
    const title = tab.title || tab.url;

    // Validate recipient key if in whistleblower mode
    let recipientPublicKey = null;
    if (isWhistleblowerMode) {
      recipientPublicKey = recipientKeyInput.value.trim();
      
      if (!recipientPublicKey) {
        setStatus("❌ Please paste recipient's public key", true);
        button.disabled = false;
        return;
      }
      setStatus("🔒 Sealing archive for recipient…");
    } else {
      setStatus("Archiving to backend…");
    }

    try {
      const body = { url, title };
      if (recipientPublicKey) {
        body.recipientPublicKey = recipientPublicKey;
      }

      const resp = await fetch("http://localhost:4000/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }

      const statusLines = ["✅ Archived!"];
      
      if (data.isEncrypted) {
        statusLines.push("", "🔒 SEALED - Only recipient can decrypt");
      }
      
      statusLines.push("", `Sui archive ID:`, data.suiArchiveId);
      
      if (data.suiTxDigest) {
        statusLines.push("", `Tx: ${data.suiTxDigest.substring(0, 20)}...`);
      }

      setStatus(statusLines.join("\n"));
    } catch (err) {
      console.error("ArchiveChain extension error:", err);
      setStatus(`❌ ${err.message || "Unknown error"}`, true);
    } finally {
      button.disabled = false;
    }
  });
});
