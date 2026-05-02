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

document.querySelectorAll(".gift-product-card").forEach((card) => {
    const giftId = card.dataset.giftId;
    const button = card.querySelector(".reserve-gift-btn");
    const input = card.querySelector(".reserve-name-input");

    if (!giftId || !button || !input) return;

    const giftRef = doc(db, "casamento-presentes", giftId);

    onSnapshot(giftRef, (snapshot) => {
        if (!snapshot.exists()) {
            card.classList.remove("is-bought");
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
        const name = input.value.trim();

        if (!name) {
            alert("Digite seu nome para reservar este presente.");
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