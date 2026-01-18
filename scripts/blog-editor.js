import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGbEpmLm2HxkFvcca6Ae4V2Kfn--d7bRo",
  authDomain: "mpms-website-80b69.firebaseapp.com",
  projectId: "mpms-website-80b69",
  storageBucket: "mpms-website-80b69.firebasestorage.app",
  messagingSenderId: "837288121384",
  appId: "1:837288121384:web:e6d25084ac17d98575d11d",
  measurementId: "G-JH8H58273B",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const authSection = document.querySelector("[data-auth-section]");
const editorSection = document.querySelector("[data-editor-section]");
const signoutBtn = document.querySelector(".admin-signout");
const adminUser = document.querySelector(".admin-user");
const form = document.querySelector("[data-blog-editor-form]");
const toolbar = document.querySelector("[data-editor-toolbar]");
const editorBody = document.querySelector("[data-editor-body]");
const imageInput = document.querySelector("[data-editor-image]");
const coverInput = document.querySelector("[data-cover-image]");
const coverPreview = document.querySelector("[data-cover-preview]");
const coverPreviewImg = coverPreview?.querySelector("img");
const coverRemoveBtn = document.querySelector("[data-cover-remove]");
const coverCropModal = document.querySelector("[data-cover-crop-modal]");
const coverCropFrame = document.querySelector("[data-cover-crop-frame]");
const coverCropImage = document.querySelector("[data-cover-crop-image]");
const coverCropZoom = document.querySelector("[data-cover-crop-zoom]");
const coverCropCancel = document.querySelector("[data-cover-crop-cancel]");
const coverCropConfirm = document.querySelector("[data-cover-crop-confirm]");
const errorText = document.querySelector(".blog-error");
const successText = document.querySelector(".blog-success");

let savedRange = null;
let editingId = null;
let currentBlock = "p";
let coverUrl = "";
let coverPreviewUrl = "";
let coverCroppedBlob = null;
let coverCroppedName = "";
let coverCropObjectUrl = "";
let coverCropState = {
  file: null,
  frameSize: 0,
  naturalWidth: 0,
  naturalHeight: 0,
  scale: 1,
  minScale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
  ready: false,
};

const COVER_OUTPUT_SIZE = 600;

const setVisible = (el, visible) => {
  if (!el) return;
  el.hidden = !visible;
};

const setError = (message) => {
  if (!errorText) return;
  errorText.textContent = message;
  errorText.hidden = !message;
};

const setSuccess = (message) => {
  if (!successText) return;
  successText.textContent = message;
  successText.hidden = !message;
};

const setCoverPreview = (url) => {
  if (!coverPreview || !coverPreviewImg) return;
  if (coverPreviewUrl && url !== coverPreviewUrl) {
    URL.revokeObjectURL(coverPreviewUrl);
    coverPreviewUrl = "";
  }
  if (!url) {
    coverPreview.hidden = true;
    coverPreviewImg.removeAttribute("src");
    return;
  }
  coverPreviewImg.src = url;
  coverPreview.hidden = false;
};

const resetCoverCropState = () => {
  coverCropState = {
    file: null,
    frameSize: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    scale: 1,
    minScale: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    ready: false,
  };
};

const closeCoverCropper = () => {
  if (coverCropModal) {
    coverCropModal.hidden = true;
  }
  if (coverCropFrame) {
    coverCropFrame.classList.remove("is-dragging");
  }
  if (coverCropObjectUrl) {
    URL.revokeObjectURL(coverCropObjectUrl);
    coverCropObjectUrl = "";
  }
  if (coverCropImage) {
    coverCropImage.removeAttribute("src");
  }
  resetCoverCropState();
};

const clampCoverOffsets = () => {
  const frame = coverCropState.frameSize;
  const scaledW = coverCropState.naturalWidth * coverCropState.scale;
  const scaledH = coverCropState.naturalHeight * coverCropState.scale;
  const minX = frame - scaledW;
  const minY = frame - scaledH;
  if (coverCropState.offsetX > 0) coverCropState.offsetX = 0;
  if (coverCropState.offsetY > 0) coverCropState.offsetY = 0;
  if (coverCropState.offsetX < minX) coverCropState.offsetX = minX;
  if (coverCropState.offsetY < minY) coverCropState.offsetY = minY;
};

const updateCoverCropStyles = () => {
  if (!coverCropImage || !coverCropState.ready) return;
  coverCropImage.style.width = `${coverCropState.naturalWidth * coverCropState.scale}px`;
  coverCropImage.style.height = `${coverCropState.naturalHeight * coverCropState.scale}px`;
  coverCropImage.style.left = `${coverCropState.offsetX}px`;
  coverCropImage.style.top = `${coverCropState.offsetY}px`;
};

const initCoverCropper = () => {
  if (!coverCropImage || !coverCropFrame) return;
  coverCropState.frameSize = coverCropFrame.clientWidth || 320;
  coverCropState.naturalWidth = coverCropImage.naturalWidth;
  coverCropState.naturalHeight = coverCropImage.naturalHeight;
  coverCropState.minScale = Math.max(
    coverCropState.frameSize / coverCropState.naturalWidth,
    coverCropState.frameSize / coverCropState.naturalHeight
  );
  coverCropState.scale = coverCropState.minScale;
  const scaledW = coverCropState.naturalWidth * coverCropState.scale;
  const scaledH = coverCropState.naturalHeight * coverCropState.scale;
  coverCropState.offsetX = (coverCropState.frameSize - scaledW) / 2;
  coverCropState.offsetY = (coverCropState.frameSize - scaledH) / 2;
  coverCropState.ready = true;
  updateCoverCropStyles();
};

const openCoverCropper = (file) => {
  if (!coverCropModal || !coverCropImage || !coverCropZoom) return;
  resetCoverCropState();
  coverCropState.file = file;
  coverCropModal.hidden = false;
  coverCropZoom.value = "1";
  coverCropImage.onload = () => {
    initCoverCropper();
  };
  coverCropObjectUrl = URL.createObjectURL(file);
  coverCropImage.src = coverCropObjectUrl;
};

const updateCoverZoom = (value) => {
  if (!coverCropState.ready || !coverCropFrame) return;
  const frameSize = coverCropState.frameSize;
  const centerX = (frameSize / 2 - coverCropState.offsetX) / coverCropState.scale;
  const centerY = (frameSize / 2 - coverCropState.offsetY) / coverCropState.scale;
  coverCropState.scale = coverCropState.minScale * value;
  coverCropState.offsetX = frameSize / 2 - centerX * coverCropState.scale;
  coverCropState.offsetY = frameSize / 2 - centerY * coverCropState.scale;
  clampCoverOffsets();
  updateCoverCropStyles();
};

const createCoverCroppedBlob = () => {
  if (!coverCropImage || !coverCropState.ready) return Promise.resolve(null);
  const canvas = document.createElement("canvas");
  canvas.width = COVER_OUTPUT_SIZE;
  canvas.height = COVER_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  const scale = coverCropState.scale;
  const sx = -coverCropState.offsetX / scale;
  const sy = -coverCropState.offsetY / scale;
  const sSize = coverCropState.frameSize / scale;
  ctx.drawImage(coverCropImage, sx, sy, sSize, sSize, 0, 0, COVER_OUTPUT_SIZE, COVER_OUTPUT_SIZE);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
};
const saveSelection = () => {
  if (!editorBody) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!editorBody.contains(range.commonAncestorContainer)) return;
  savedRange = range;
};

const placeCaretAtEnd = () => {
  if (!editorBody) return;
  const range = document.createRange();
  range.selectNodeContents(editorBody);
  range.collapse(false);
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange = range;
};

const restoreSelection = () => {
  const selection = window.getSelection();
  if (!selection || !editorBody) return;
  if (savedRange && editorBody.contains(savedRange.commonAncestorContainer)) {
    selection.removeAllRanges();
    selection.addRange(savedRange);
    return;
  }
  placeCaretAtEnd();
};

const ensureEditorSelection = () => {
  if (!editorBody) return;
  editorBody.focus();
  restoreSelection();
};

const applyBlockFormat = (value) => {
  if (!value) return;
  currentBlock = value;
  ensureEditorSelection();
  const tag = value.startsWith("<") ? value : `<${value}>`;
  document.execCommand("formatBlock", false, tag);
};

const applyBlockFormatAtCursor = (value) => {
  if (!value || !editorBody) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  if (!editorBody.contains(selection.getRangeAt(0).commonAncestorContainer)) {
    return;
  }
  currentBlock = value;
  const tag = value.startsWith("<") ? value : `<${value}>`;
  document.execCommand("formatBlock", false, tag);
  saveSelection();
};

const execCommand = (command, value = null) => {
  if (!editorBody) return;
  ensureEditorSelection();
  document.execCommand(command, false, value);
};

const handleToolbarClick = (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  saveSelection();
  const cmd = button.dataset.cmd;
  const action = button.dataset.action;
  if (cmd) {
    execCommand(cmd, button.dataset.value || null);
    return;
  }
  if (action === "link") {
    const url = window.prompt("Enter link URL");
    if (!url) return;
    execCommand("createLink", url);
  }
  if (action === "image") {
    imageInput?.click();
  }
};

const setInlineStyle = (style) => {
  ensureEditorSelection();
  const isBold = document.queryCommandState("bold");
  const isItalic = document.queryCommandState("italic");
  const wantBold = style === "bold" || style === "bold-italic";
  const wantItalic = style === "italic" || style === "bold-italic";
  if (isBold !== wantBold) {
    document.execCommand("bold", false, null);
  }
  if (isItalic !== wantItalic) {
    document.execCommand("italic", false, null);
  }
};

const clearLists = () => {
  if (document.queryCommandState("insertUnorderedList")) {
    document.execCommand("insertUnorderedList", false, null);
  }
  if (document.queryCommandState("insertOrderedList")) {
    document.execCommand("insertOrderedList", false, null);
  }
};

const setListStyle = (value) => {
  ensureEditorSelection();
  if (value === "unordered") {
    if (document.queryCommandState("insertOrderedList")) {
      document.execCommand("insertOrderedList", false, null);
    }
    document.execCommand("insertUnorderedList", false, null);
    return;
  }
  if (value === "ordered") {
    if (document.queryCommandState("insertUnorderedList")) {
      document.execCommand("insertUnorderedList", false, null);
    }
    document.execCommand("insertOrderedList", false, null);
    return;
  }
  clearLists();
};

const insertImageAtSelection = (url) => {
  if (!url) return;
  execCommand("insertImage", url);
};

const handleImageUpload = async (file) => {
  if (!file) return;
  setError("");
  setSuccess("Uploading image...");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileRef = ref(storage, `blog/${Date.now()}-${safeName}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  insertImageAtSelection(url);
  setSuccess("Image added.");
};

const handleCoverUpload = async () => {
  if (!coverCroppedBlob) return coverUrl;
  setError("");
  setSuccess("Uploading cover image...");
  const safeName = (coverCroppedName || "cover.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileRef = ref(storage, `blog-covers/${Date.now()}-${safeName}`);
  await uploadBytes(fileRef, coverCroppedBlob);
  const url = await getDownloadURL(fileRef);
  coverCroppedBlob = null;
  coverCroppedName = "";
  coverUrl = url;
  setSuccess("Cover image added.");
  return url;
};

const loadPost = async (id) => {
  try {
    const snapshot = await getDoc(doc(db, "blogPosts", id));
    if (!snapshot.exists()) {
      setError("Post not found.");
      return;
    }
    const data = snapshot.data();
    const titleInput = form?.querySelector("input[name='title']");
    const categoryInput = form?.querySelector("input[name='category']");
    const excerptInput = form?.querySelector("textarea[name='excerpt']");
    if (titleInput) titleInput.value = data.title ?? "";
    if (categoryInput) categoryInput.value = data.category ?? "";
    if (excerptInput) excerptInput.value = data.excerpt ?? "";
    if (editorBody) {
      editorBody.innerHTML = data.bodyHtml ?? "";
      if (!data.bodyHtml && data.body) {
        editorBody.textContent = data.body;
      }
    }
    coverUrl = data.coverImageUrl ?? "";
    coverCroppedBlob = null;
    coverCroppedName = "";
    if (coverInput) {
      coverInput.value = "";
    }
    if (coverUrl) {
      setCoverPreview(coverUrl);
    } else {
      setCoverPreview("");
    }
    currentBlock = "p";
    const blockSelect = toolbar?.querySelector("[data-block-select]");
    if (blockSelect instanceof HTMLSelectElement) {
      blockSelect.value = currentBlock;
    }
    const submitBtn = form?.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.textContent = "Update Post";
    }
  } catch (error) {
    setError("Unable to load this post.");
  }
};

const savePost = async () => {
  if (!form || !editorBody) return;
  setError("");
  setSuccess("");
  const formData = new FormData(form);
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const bodyHtml = editorBody.innerHTML.trim();
  const bodyText = editorBody.textContent?.trim() ?? "";

  if (!title || (!bodyHtml && !bodyText)) {
    setError("Title and body are required.");
    return;
  }

  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn?.setAttribute("disabled", "disabled");

  try {
    if (coverInput?.files?.length && !coverCroppedBlob) {
      setError("Please crop the cover image before saving.");
      submitBtn?.removeAttribute("disabled");
      return;
    }
    const finalCoverUrl = await handleCoverUpload();
    if (editingId) {
      await updateDoc(doc(db, "blogPosts", editingId), {
        title,
        category,
        excerpt,
        bodyHtml,
        coverImageUrl: finalCoverUrl,
        updatedAt: serverTimestamp(),
      });
      setSuccess("Post updated.");
    } else {
      const payload = {
        title,
        category,
        excerpt,
        bodyHtml,
        coverImageUrl: finalCoverUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const newDoc = await addDoc(collection(db, "blogPosts"), payload);
      editingId = newDoc.id;
      setSuccess("Post published.");
    }
  } catch (error) {
    setError("Save failed. Please try again.");
  } finally {
    submitBtn?.removeAttribute("disabled");
  }
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await savePost();
});

toolbar?.addEventListener("click", handleToolbarClick);

toolbar?.addEventListener("pointerdown", () => {
  saveSelection();
});

toolbar?.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.dataset.blockSelect !== undefined) {
    applyBlockFormat(target.value);
  }
  if (target.dataset.textStyle !== undefined) {
    setInlineStyle(target.value);
  }
  if (target.dataset.listStyle !== undefined) {
    setListStyle(target.value);
  }
});

editorBody?.addEventListener("keyup", saveSelection);
editorBody?.addEventListener("mouseup", saveSelection);
editorBody?.addEventListener("focus", saveSelection);
editorBody?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    setTimeout(() => {
      if (
        !document.queryCommandState("insertUnorderedList") &&
        !document.queryCommandState("insertOrderedList")
      ) {
        applyBlockFormatAtCursor(currentBlock);
      }
    }, 0);
  }
});

imageInput?.addEventListener("change", async () => {
  if (!imageInput.files?.length) return;
  try {
    await handleImageUpload(imageInput.files[0]);
  } catch (error) {
    setError("Image upload failed.");
  } finally {
    imageInput.value = "";
  }
});

coverCropZoom?.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  updateCoverZoom(parseFloat(target.value));
});

coverCropFrame?.addEventListener("pointerdown", (event) => {
  if (!coverCropState.ready) return;
  event.preventDefault();
  coverCropState.dragging = true;
  coverCropState.startX = event.clientX;
  coverCropState.startY = event.clientY;
  coverCropState.startOffsetX = coverCropState.offsetX;
  coverCropState.startOffsetY = coverCropState.offsetY;
  coverCropFrame.classList.add("is-dragging");
});

window.addEventListener("pointermove", (event) => {
  if (!coverCropState.dragging) return;
  coverCropState.offsetX =
    coverCropState.startOffsetX + (event.clientX - coverCropState.startX);
  coverCropState.offsetY =
    coverCropState.startOffsetY + (event.clientY - coverCropState.startY);
  clampCoverOffsets();
  updateCoverCropStyles();
});

window.addEventListener("pointerup", () => {
  if (!coverCropState.dragging) return;
  coverCropState.dragging = false;
  coverCropFrame?.classList.remove("is-dragging");
});

coverCropCancel?.addEventListener("click", () => {
  if (coverInput) {
    coverInput.value = "";
  }
  coverCroppedBlob = null;
  coverCroppedName = "";
  if (coverUrl) {
    setCoverPreview(coverUrl);
  } else {
    setCoverPreview("");
  }
  closeCoverCropper();
});

coverCropConfirm?.addEventListener("click", async () => {
  const blob = await createCoverCroppedBlob();
  if (!blob) {
    setError("Unable to crop the cover image.");
    return;
  }
  const originalName = coverCropState.file?.name ?? "cover.jpg";
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  coverCroppedName = `${baseName}.jpg`;
  coverCroppedBlob = blob;
  coverUrl = "";
  if (coverPreviewUrl) {
    URL.revokeObjectURL(coverPreviewUrl);
    coverPreviewUrl = "";
  }
  const previewUrl = URL.createObjectURL(blob);
  coverPreviewUrl = previewUrl;
  setCoverPreview(previewUrl);
  if (coverInput) {
    coverInput.value = "";
  }
  closeCoverCropper();
});

coverInput?.addEventListener("change", () => {
  if (!coverInput.files?.length) return;
  const file = coverInput.files[0];
  coverUrl = "";
  coverCroppedBlob = null;
  coverCroppedName = "";
  if (coverPreviewUrl) {
    URL.revokeObjectURL(coverPreviewUrl);
    coverPreviewUrl = "";
  }
  openCoverCropper(file);
});

coverRemoveBtn?.addEventListener("click", () => {
  coverUrl = "";
  coverCroppedBlob = null;
  coverCroppedName = "";
  if (coverInput) {
    coverInput.value = "";
  }
  if (coverPreviewUrl) {
    URL.revokeObjectURL(coverPreviewUrl);
    coverPreviewUrl = "";
  }
  setCoverPreview("");
});

const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");

const initEditor = async () => {
  if (idParam) {
    editingId = idParam;
    await loadPost(idParam);
  }
};

const authForm = document.querySelector(".auth-form");
const authError = document.querySelector(".auth-error");

const setAuthError = (message) => {
  if (!authError) return;
  authError.textContent = message;
  authError.hidden = !message;
};

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthError("");
  const formData = new FormData(authForm);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const message =
      error?.code === "auth/invalid-credential"
        ? "Invalid email or password."
        : "Sign in failed. Please try again.";
    setAuthError(message);
  }
});

signoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    setVisible(authSection, false);
    setVisible(editorSection, true);
    if (adminUser) {
      adminUser.textContent = user.email ? `Signed in as ${user.email}` : "Signed in";
    }
    await initEditor();
  } else {
    setVisible(authSection, true);
    setVisible(editorSection, false);
    if (adminUser) {
      adminUser.textContent = "";
    }
  }
});
