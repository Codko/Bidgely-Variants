const mascot = document.getElementById("mascot-container");
const bubble = document.getElementById("speech-bubble");
const chatInterface = document.getElementById("chat-interface");
const chatBody = document.getElementById("chat-body");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const boltPath = document.getElementById("bolt-path");
const statusText = document.getElementById("status-text");
const statusDot = document.querySelector(".status-dot");

let isTourActive = false;
let isChatOpen = false;
let currentSection = "";
let anomalyActive = false;
let isIdle = false;
let idleTimer;
let idleWalkTimeout;
let mainWalkTween;
let walkAnimTweens = [];
const idleTimeoutLimit = 5000;

// --- Voice Setup ---
const synth = window.speechSynthesis;
let voiceHasBeenTriggered = false;

function speakOutLoud(text) {
  if (!synth) return;
  if (synth.speaking) synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1.2;
  utterance.rate = 1.1;

  const voices = synth.getVoices();
  const techVoice = voices.find(
    (v) =>
      v.name.includes("Google US English") ||
      v.name.includes("Samantha") ||
      v.name.includes("Daniel")
  );
  if (techVoice) utterance.voice = techVoice;

  synth.speak(utterance);
}

function speak(text, duration = 2) {
  if (isChatOpen) return;
  bubble.innerText = text;
  gsap.to(bubble, {
    opacity: 1,
    scale: 1,
    duration: 0.3,
    ease: "back.out",
  });

  if (voiceHasBeenTriggered) speakOutLoud(text);

  if (window.bubbleTimeout) clearTimeout(window.bubbleTimeout);
  window.bubbleTimeout = setTimeout(() => {
    gsap.to(bubble, { opacity: 0, scale: 0.5, duration: 0.3 });
  }, duration * 1000);
}

function updateSystemStatus(status, color) {
  if (!statusText || !statusDot) return;
  statusText.innerText = `AI: ${status}`;
  gsap.to(statusDot, {
    backgroundColor: color,
    boxShadow: `0 0 8px ${color}`,
    duration: 0.3,
  });
}

function moveToElement(element, offsetX = 0, offsetY = 0, duration = 1) {
  const rect = element.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;
  const absoluteLeft = window.scrollX + rect.left;

  gsap.to(mascot, {
    x: absoluteLeft + offsetX,
    y: absoluteTop + offsetY,
    duration: duration,
    ease: "back.out(1.5)",
  });
}

// --- Lightning & Trails ---
function createLightningTrail() {
  const sparks = document.getElementById("sparks");
  if (!sparks) return;
  sparks.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", 50);
    line.setAttribute("y1", 60);
    line.setAttribute("x2", 50 + (Math.random() - 0.5) * 100);
    line.setAttribute("y2", 60 + (Math.random() - 0.5) * 100);
    sparks.appendChild(line);
  }
  gsap.fromTo("#sparks", { opacity: 1 }, { opacity: 0, duration: 0.4 });
}

// --- Movement Engine ---
function fastMove(targetX, targetY) {
  updateSystemStatus("SURGING", "#00ffff");
  createLightningTrail();

  gsap.to(boltPath, {
    scaleY: 1.8,
    scaleX: 0.6,
    duration: 0.1,
    fill: "#fff",
  });

  gsap.to(mascot, {
    x: targetX,
    y: targetY,
    duration: 0.3,
    ease: "power4.inOut",
    onComplete: () => {
      gsap.to(boltPath, {
        scaleY: 1,
        scaleX: 1,
        fill: "url(#boltGrad)",
        duration: 0.4,
        ease: "elastic.out(1, 0.3)",
      });
      updateSystemStatus("STABLE", "#00d084");
      speak("Data Point Locked.");
    },
  });
}

// --- Anomaly Logic ---
function summonAnomaly() {
  if (anomalyActive) return;
  anomalyActive = true;

  const anomaly = document.getElementById("anomaly-container");
  const anomalyBubble = document.getElementById("anomaly-bubble");

  const dx = gsap.getProperty(mascot, "x");
  const dy = gsap.getProperty(mascot, "y");

  gsap.set(anomaly, { x: dx - 400, y: dy - 10, scaleX: 1 });

  gsap.to(anomaly, {
    x: dx + 130,
    y: dy + 10,
    duration: 1.2,
    ease: "power2.out",
    onComplete: () => {
      gsap.to(anomalyBubble, {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: "back.out",
      });
      gsap.to("#anomaly-svg", {
        rotation: 10,
        yoyo: true,
        repeat: 10,
        duration: 0.05,
      });
      speakOutLoud("Warning! Unauthorized load detected on grid sector 7!");

      setTimeout(() => {
        gsap.to(anomalyBubble, { opacity: 0, scale: 0.5, duration: 0.2 });
        gsap.to(anomaly, {
          x: window.innerWidth + 200,
          duration: 1.5,
          ease: "power2.in",
          onComplete: () => {
            anomalyActive = false;
          },
        });
      }, 3500);
    },
  });
}

// --- Draggable Setup ---
Draggable.create(mascot, {
  type: "x,y",
  trigger: "#bolt-core",
  bounds: "body",
  onDragStart: function () {
    if (isTourActive) return;
    voiceHasBeenTriggered = true;
    isIdle = true;
    clearTimeout(idleTimer);
    updateSystemStatus("INTERCEPTED", "#ff003c");

    if (isChatOpen) closeChat();

    gsap.to(["#hand-l", "#hand-r", "#foot-l", "#foot-r"], {
      y: -20,
      x: (i) => (i % 2 === 0 ? 15 : -15),
      rotation: 45,
      yoyo: true,
      repeat: -1,
      duration: 0.08,
    });

    speak("Recalibrating position...", 3);
  },
  onDragEnd: function () {
    gsap.to(["#hand-l", "#hand-r", "#foot-l", "#foot-r"], {
      y: 0,
      x: 0,
      rotation: 0,
      duration: 0.2,
    });
    updateSystemStatus("STABLE", "#00d084");
    isIdle = false;
    resetIdleTimer();
  },
  onClick: function () {
    if (isTourActive || isChatOpen) return;
    openChat();
  },
});

function openChat() {
  isChatOpen = true;
  voiceHasBeenTriggered = true;

  gsap.to(bubble, { opacity: 0, scale: 0.5, duration: 0.1 });
  chatInterface.style.display = "flex";
  gsap.fromTo(
    chatInterface,
    { opacity: 0, scale: 0.5, y: 50 },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.4,
      ease: "back.out(1.2)",
    }
  );

  gsap.to("#bolt-core", { rotation: 10, duration: 0.3 });
  gsap.fromTo(
    "#hand-r",
    { y: 0 },
    { y: -15, repeat: 3, yoyo: true, duration: 0.15 }
  );

  speakOutLoud("Grid AI connected. Awaiting query.");
  chatInput.focus();
}

function closeChat() {
  gsap.to(chatInterface, {
    opacity: 0,
    scale: 0.5,
    y: 50,
    duration: 0.3,
    ease: "power2.in",
    onComplete: () => {
      chatInterface.style.display = "none";
      isChatOpen = false;
      gsap.to("#bolt-core", { rotation: 0, duration: 0.3 });
    },
  });
}

// --- Chat Logic ---
function processUserMessage() {
  const originalText = chatInput.value.trim();
  const text = originalText.toLowerCase();
  if (!text) return;

  chatBody.innerHTML += `<p class="user-msg"><strong>You:</strong> ${originalText}</p>`;
  chatInput.value = "";
  chatBody.scrollTop = chatBody.scrollHeight;

  let response = "Processing query... I can provide data on EV loads and forecasting.";

  if (text.includes("algorithm")) {
    response = "Our patented algorithms detect appliances with 98% accuracy. ⚡";
  } else if (text.includes("data") || text.includes("metrics")) {
    response = "Data streams look optimal. ROI is tracking at 3x for this quarter. 📈";
    gsap.timeline()
      .to("#bolt-core", { y: "-=20", yoyo: true, repeat: 3, duration: 0.15, ease: "power1.inOut" }, 0)
      .to(["#hand-l", "#hand-r"], { y: "-=10", yoyo: true, repeat: 3, duration: 0.15 }, 0);
  } else if (text.includes("anomaly") || text.includes("spike")) {
    response = "Anomaly detected! Rerouting analytics...";
    summonAnomaly();
  } else if (text.includes("hello") || text.includes("hi")) {
    response = "Greetings. Systems are fully operational.";
  }

  setTimeout(() => {
    chatBody.innerHTML += `<p><strong>Bidgely AI:</strong> ${response}</p>`;
    chatBody.scrollTop = chatBody.scrollHeight;
    speakOutLoud(response);
  }, 500);
}

chatSend.addEventListener("click", processUserMessage);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") processUserMessage();
});

// --- Idle Engine ---
function startLegAnimation() {
  stopLegAnimation();
  walkAnimTweens.push(
    gsap.to("#foot-l", { y: -8, duration: 0.2, repeat: -1, yoyo: true, ease: "power1.inOut" }),
    gsap.to("#foot-r", { y: -8, duration: 0.2, repeat: -1, yoyo: true, ease: "power1.inOut", delay: 0.2 }),
    gsap.to("#bolt-core", { rotation: 5, transformOrigin: "center center", duration: 0.2, repeat: -1, yoyo: true, ease: "power1.inOut" })
  );
}

function stopLegAnimation() {
  walkAnimTweens.forEach((t) => t.kill());
  walkAnimTweens = [];
  gsap.to(["#foot-l", "#foot-r"], { y: 0, duration: 0.2 });
  gsap.to("#bolt-core", { rotation: 0, duration: 0.2 });
}

function doRandomWalk() {
  if (!isIdle) return;

  const targetX = Math.max(20, Math.random() * (window.innerWidth - 150));
  const targetY = window.scrollY + Math.max(50, Math.random() * (window.innerHeight - 150));
  const currentX = gsap.getProperty(mascot, "x");
  const currentY = gsap.getProperty(mascot, "y");

  const dist = Math.hypot(targetX - currentX, targetY - currentY);
  const duration = Math.max(1, dist / 100);

  const direction = targetX > currentX ? 1 : -1;
  gsap.to("#bolt-core", { scaleX: direction, duration: 0.3 });

  startLegAnimation();

  mainWalkTween = gsap.to(mascot, {
    x: targetX,
    y: targetY,
    duration: duration,
    ease: "none",
    onComplete: () => {
      stopLegAnimation();
      idleWalkTimeout = setTimeout(() => doRandomWalk(), 1500 + Math.random() * 2000);
    },
  });
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (isIdle) {
    isIdle = false;
    clearTimeout(idleWalkTimeout);
    if (mainWalkTween) mainWalkTween.kill();
    stopLegAnimation();
    gsap.to("#bolt-core", { scaleX: 1, rotation: 0, duration: 0.4 });

    const centerViewport = window.scrollY + window.innerHeight / 2 - 60;
    gsap.to(mascot, {
      y: window.scrollY > 50 ? centerViewport : window.scrollY + 50,
      x: 50,
      duration: 1,
      ease: "power2.out",
    });
  }
  idleTimer = setTimeout(() => {
    if (isTourActive || isChatOpen || anomalyActive) return;
    isIdle = true;
    speak("Scanning grid perimeter...", 2.5);
    doRandomWalk();
  }, idleTimeoutLimit);
}

// --- Event Listeners ---
window.addEventListener("mousemove", resetIdleTimer);
window.addEventListener("scroll", resetIdleTimer);
window.addEventListener("click", resetIdleTimer);
window.addEventListener("keypress", resetIdleTimer);

// --- Initial Bobbing ---
gsap.to("#eyes", { scaleY: 0.2, transformOrigin: "center", repeat: -1, repeatDelay: 3.5, yoyo: true, duration: 0.1 });
gsap.to("#bolt-core", { y: "+=10", repeat: -1, yoyo: true, ease: "sine.inOut", duration: 1.5 });

// --- Smooth Scroll ---
document.querySelectorAll(".nav-links a").forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    gsap.to(window, { duration: 1, scrollTo: targetId, ease: "power3.inOut" });
  });
});

// --- Guided Tour ---
document.getElementById("start-tour").addEventListener("click", () => {
  if (isTourActive) return;
  if (isChatOpen) closeChat();

  isTourActive = true;
  voiceHasBeenTriggered = true;

  gsap.to("#bolt-core", { scaleX: 1, rotation: 0, opacity: 1, scale: 1, duration: 0.5 });

  const tl = gsap.timeline({
    onComplete: () => {
      isTourActive = false;
      currentSection = "";
      speak("Tour complete. Manual override engaged.", 3);
      gsap.to(mascot, {
        x: 50,
        y: window.scrollY + window.innerHeight / 2 - 60,
        duration: 1,
        ease: "power2.out",
      });
    },
  });

  tl.add(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    moveToElement(document.getElementById("hero-title"), -120, -50);
    speak("Initiating guided sequence...", 2.5);
  }, "+=0.5")
    .add(() => {
      document.getElementById("features").scrollIntoView({ behavior: "smooth" });
      moveToElement(document.querySelector(".card-container"), -50, -80);
      speak("These modules predict load with 98% accuracy.", 2.5);
    }, "+=3")
    .add(() => {
      document.getElementById("testimonials").scrollIntoView({ behavior: "smooth" });
      const testCard = document.querySelector(".testimonial-card");
      if (testCard) moveToElement(testCard, -100, -20);
      speak("Client metrics show 40% increased engagement.", 2.5);
    }, "+=3")
    .add(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      moveToElement(document.getElementById("hero-btn"), 80, -90);
      speak("Click to initialize your custom scan.", 3);
    }, "+=3");
});

// --- Initial Entry ---
gsap.to(mascot, {
  x: 50,
  y: window.scrollY + 50,
  duration: 2,
  ease: "elastic.out(1, 0.5)",
  delay: 0.5,
  onComplete: () => {
    speak("Bidgely-AI initialized. Awaiting input.", 3);
    resetIdleTimer();
  },
});

// --- UI Interactions ---
document.querySelectorAll(".cta-btn:not(#start-tour)").forEach((btn) => {
  btn.addEventListener("mouseenter", () => {
    if (isTourActive || isChatOpen || isIdle || Draggable.get(mascot).isDragging) return;
    const centerX = btn.offsetWidth / 2 - 60;
    moveToElement(btn, centerX, -100, 0.4);
    gsap.to("#bolt-core", { rotation: 5, scale: 1.1, duration: 0.3 });
    gsap.to(["#hand-l", "#hand-r"], { x: (i) => (i === 0 ? 10 : -10), y: -5, duration: 0.3 });
    speak("Action recommended.", 1.5);
  });
  btn.addEventListener("mouseleave", () => {
    if (isTourActive || isChatOpen || isIdle || Draggable.get(mascot).isDragging) return;
    gsap.to("#bolt-core", { rotation: 0, scale: 1, duration: 0.3 });
    gsap.to(["#hand-l", "#hand-r"], { x: 0, y: 0, duration: 0.3 });
  });
});

document.querySelectorAll("section").forEach((section) => {
  section.addEventListener("mouseenter", () => {
    if (isTourActive || isChatOpen || isIdle || Draggable.get(mascot).isDragging) return;
    if (currentSection !== section.id) {
      currentSection = section.id;
      const sectionMessages = {
        hero: "Analyzing primary objectives...",
        features: "Reviewing predictive load capabilities.",
        testimonials: "Processing client success metrics.",
        faqs: "Accessing technical documentation.",
      };
      if (sectionMessages[section.id]) speak(sectionMessages[section.id], 2.5);
    }
  });
});

document.querySelectorAll(".feature-card, .faq-item").forEach((card) => {
  card.addEventListener("mouseenter", () => {
    if (isTourActive || isChatOpen || isIdle || Draggable.get(mascot).isDragging) return;
    moveToElement(card, -80, 20, 0.6);
    gsap.to("#bolt-core", { opacity: 0.6, scale: 0.8, x: -20, duration: 0.5 });
  });
  card.addEventListener("mouseleave", () => {
    if (isTourActive || isChatOpen || isIdle || Draggable.get(mascot).isDragging) return;
    gsap.to("#bolt-core", { opacity: 1, scale: 1, x: 0, duration: 0.5 });
  });
});

window.addEventListener("scroll", () => {
  if (isTourActive || isIdle || Draggable.get(mascot).isDragging) return;
  const centerViewport = window.scrollY + window.innerHeight / 2 - 60;
  gsap.to(mascot, {
    y: window.scrollY > 50 ? centerViewport : window.scrollY + 50,
    x: 50,
    duration: 1,
    ease: "power1.out",
  });
});
