import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBIIO-LYj41Ir7VOtG7240vgnuh6_JN1pw",
    authDomain: "casamento-df6d5.firebaseapp.com",
    projectId: "casamento-df6d5",
    storageBucket: "casamento-df6d5.firebasestorage.app",
    messagingSenderId: "89839975736",
    appId: "1:89839975736:web:7434c833fe1d9f5af455cd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   CONFIGURAÇÃO PIX
========================= */

const PIX_KEY = "13616840970";
const PIX_NAME = "EDUARDO BRYAN BRAGA";
const PIX_CITY = "CURITIBA";

let currentPixPayload = "";

const pixGiftModal = document.getElementById("pixGiftModal");
const pixGiftClose = document.getElementById("pixGiftClose");
const pixGiftTitle = document.getElementById("pixGiftTitle");
const pixGiftText = document.querySelector(".pix-gift-text");
const pixGiftAmount = document.getElementById("pixGiftAmount");
const pixGiftQrCode = document.getElementById("pixGiftQrCode");
const copyPixCodeBtn = document.getElementById("copyPixCodeBtn");
const copyPixFeedback = document.getElementById("copyPixFeedback");

function sanitizeText(value, maxLength) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z0-9 ]/gi, "")
        .toUpperCase()
        .substring(0, maxLength);
}

function formatPixField(id, value) {
    const stringValue = String(value);
    const length = String(stringValue.length).padStart(2, "0");
    return `${id}${length}${stringValue}`;
}

function crc16(payload) {
    let crc = 0xffff;

    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;

        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }

            crc &= 0xffff;
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, "0");
}

function createPixPayload({ key, name, city, amount = null, txid = "CASAMENTO" }) {
    const gui = formatPixField("00", "BR.GOV.BCB.PIX");
    const pixKeyField = formatPixField("01", key);
    const merchantAccountInfo = formatPixField("26", gui + pixKeyField);

    const numericAmount =
        typeof amount === "number" && Number.isFinite(amount) && amount > 0
            ? amount
            : null;

    const amountField = numericAmount !== null
        ? formatPixField("54", numericAmount.toFixed(2))
        : "";

    const payloadWithoutCRC =
        formatPixField("00", "01") +
        formatPixField("01", "12") +
        merchantAccountInfo +
        formatPixField("52", "0000") +
        formatPixField("53", "986") +
        amountField +
        formatPixField("58", "BR") +
        formatPixField("59", sanitizeText(name, 25)) +
        formatPixField("60", sanitizeText(city, 15)) +
        formatPixField("62", formatPixField("05", sanitizeText(txid, 25))) +
        "6304";

    return payloadWithoutCRC + crc16(payloadWithoutCRC);
}

function parseBRLToNumber(value) {
    if (!value) return 0;

    const cleanValue = String(value)
        .replace("R$", "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    const numberValue = Number(cleanValue);

    return Number.isFinite(numberValue) ? numberValue : 0;
}

function getGiftTitle(card) {
    const titleElement = card.querySelector(".gift-product-content h2");
    return titleElement ? titleElement.textContent.trim() : "Presente selecionado";
}

function getGiftPriceText(card) {
    const priceElement = card.querySelector(".gift-product-price strong");
    return priceElement ? priceElement.textContent.trim() : "R$ 0,00";
}

function isFreePixGift(card, button) {
    const giftId = card.dataset.giftId || "";

    return (
        giftId === "fotografo-casamento" ||
        card.dataset.pixFree === "true" ||
        button?.dataset.pixFree === "true"
    );
}

function renderQRCode(payload) {
    if (!pixGiftQrCode || typeof QRCode === "undefined") return;

    pixGiftQrCode.innerHTML = "";

    new QRCode(pixGiftQrCode, {
        text: payload,
        width: 220,
        height: 220,
        colorDark: "#111111",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

function openPixModal(card, button) {
    if (!pixGiftModal || !pixGiftTitle || !pixGiftAmount || !pixGiftQrCode) return;

    const title = getGiftTitle(card);
    const priceText = getGiftPriceText(card);
    const isFreePix = isFreePixGift(card, button);

    pixGiftTitle.textContent = title;

    if (isFreePix) {
        pixGiftAmount.textContent = "Contribuição livre";

        if (pixGiftText) {
            pixGiftText.textContent =
                "Você pode contribuir com qualquer valor via Pix para nos ajudar com o fotógrafo do casamento. Toda ajuda será recebida com muito carinho e gratidão.";
        }

        currentPixPayload = createPixPayload({
            key: PIX_KEY,
            name: PIX_NAME,
            city: PIX_CITY,
            amount: null,
            txid: "FOTOGRAFO"
        });
    } else {
        const amount = parseBRLToNumber(priceText);

        pixGiftAmount.textContent = priceText;

        if (pixGiftText) {
            pixGiftText.textContent =
                "Escaneie o QR Code ou copie o código Pix para nos presentear. O valor exibido corresponde ao item selecionado.";
        }

        currentPixPayload = createPixPayload({
            key: PIX_KEY,
            name: PIX_NAME,
            city: PIX_CITY,
            amount,
            txid: "CASAMENTO"
        });
    }

    renderQRCode(currentPixPayload);

    if (copyPixFeedback) {
        copyPixFeedback.classList.remove("show");
    }

    pixGiftModal.classList.remove("is-hidden");
}

function closePixModal() {
    if (!pixGiftModal) return;
    pixGiftModal.classList.add("is-hidden");
}

async function copyPixCode() {
    if (!currentPixPayload) return;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(currentPixPayload);
        } else {
            const temp = document.createElement("textarea");
            temp.value = currentPixPayload;
            temp.setAttribute("readonly", "");
            temp.style.position = "absolute";
            temp.style.left = "-9999px";
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
        }

        if (copyPixFeedback) {
            copyPixFeedback.textContent = "Código Pix copiado!";
            copyPixFeedback.classList.add("show");

            setTimeout(() => {
                copyPixFeedback.classList.remove("show");
            }, 2500);
        }
    } catch (error) {
        console.error("Erro ao copiar código Pix:", error);

        if (copyPixFeedback) {
            copyPixFeedback.textContent = "Não foi possível copiar. Tente novamente.";
            copyPixFeedback.classList.add("show");

            setTimeout(() => {
                copyPixFeedback.classList.remove("show");
            }, 2500);
        }
    }
}

if (pixGiftClose) {
    pixGiftClose.addEventListener("click", closePixModal);
}

if (pixGiftModal) {
    pixGiftModal.addEventListener("click", (event) => {
        if (event.target === pixGiftModal) {
            closePixModal();
        }
    });
}

if (copyPixCodeBtn) {
    copyPixCodeBtn.addEventListener("click", copyPixCode);
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closePixModal();
    }
});

/* =========================
   PRESENTEAR VIA PIX
========================= */

document.querySelectorAll(".gift-product-card").forEach((card) => {
    const pixButton = card.querySelector(".pix-reserve-btn");

    if (!pixButton) return;

    pixButton.addEventListener("click", () => {
        openPixModal(card, pixButton);
    });
});

/* =========================
   RESERVA DE PRESENTES
========================= */

document.querySelectorAll(".gift-product-card").forEach((card) => {
    const giftId = card.dataset.giftId;
    const button = card.querySelector(".reserve-gift-btn");
    const input = card.querySelector(".reserve-name-input");

    /*
      Alguns cards especiais, como o fotógrafo,
      não possuem campo de reserva. Eles funcionam apenas via Pix.
    */
    if (!giftId || !button || !input) return;

    const giftRef = doc(db, "casamento-presentes", giftId);

    onSnapshot(giftRef, (snapshot) => {
        if (!snapshot.exists()) {
            card.classList.remove("is-bought");
            card.classList.remove("just-reserved");
            return;
        }

        const data = snapshot.data();

        if (data.status === "reserved") {
            card.classList.add("is-bought");

            if (sessionStorage.getItem(`giftReserved_${giftId}`) === "true") {
                card.classList.add("just-reserved");
            } else {
                card.classList.remove("just-reserved");
            }
        } else {
            card.classList.remove("is-bought");
            card.classList.remove("just-reserved");
        }
    });

    button.addEventListener("click", async () => {
        const name = input.value.trim().replace(/\s+/g, " ");

        if (!name) {
            alert("Digite seu nome para reservar este presente.");
            input.focus();
            return;
        }

        if (name.length < 2) {
            alert("Digite seu nome corretamente.");
            input.focus();
            return;
        }

        const alreadyReserved = await getDoc(giftRef);

        if (alreadyReserved.exists() && alreadyReserved.data().status === "reserved") {
            alert("Este presente acabou de ser reservado por outra pessoa.");
            return;
        }

        const confirmReserve = confirm(
            "Depois de reservar, este presente ficará indisponível para os demais convidados. Deseja continuar?"
        );

        if (!confirmReserve) return;

        button.disabled = true;
        button.textContent = "Reservando...";

        try {
            await setDoc(giftRef, {
                status: "reserved",
                reservedBy: name,
                reservedAt: serverTimestamp()
            });

            sessionStorage.setItem(`giftReserved_${giftId}`, "true");
            card.classList.add("just-reserved");
            input.value = "";
        } catch (error) {
            console.error("Erro ao reservar presente:", error);
            alert("Não foi possível reservar agora. Tente novamente.");

            button.disabled = false;
            button.textContent = "Reservar presente";
        }
    });
});