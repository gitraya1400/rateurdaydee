// Import Firebase modules
import { db } from "./firebase-config.js"
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js"

// User credentials - simple username/password pairs
const validUsers = [
  { username: "icha", password: "110406" },
  { username: "raya", password: "140405" },
  { username: "admin", password: "1234" }, // Tambahkan user admin
]

// DOM Elements
const loginContainer = document.getElementById("login-container")
const appContainer = document.getElementById("app-container")
const loginForm = document.getElementById("login-form")
const loginError = document.getElementById("login-error")
const userDisplay = document.getElementById("user-display")
const logoutBtn = document.getElementById("logout-btn")
const navLinks = document.querySelectorAll(".nav-link")
const pages = document.querySelectorAll(".page")
const dailyForm = document.getElementById("daily-form")
const stars = document.querySelectorAll(".star-rating i")
const ratingInput = document.getElementById("rating-value")
const playlistPopup = document.getElementById("playlist-popup")
const closePopup = document.querySelector(".close-popup")
const prevMonthBtn = document.getElementById("prev-month")
const nextMonthBtn = document.getElementById("next-month")
const currentMonthDisplay = document.getElementById("current-month-display")
const calendarDays = document.getElementById("calendar-days")
const dayDetails = document.getElementById("day-details")
const selectedDate = document.getElementById("selected-date")
const dayContent = document.getElementById("day-content")
const userSelector = document.getElementById("user-selector")
const specialDatePopup = document.getElementById("special-date-popup")
const specialDateTitle = document.getElementById("special-date-title")
const specialDateMessage = document.getElementById("special-date-message")
const celebrationAnimation = document.getElementById("celebration-animation")
const adminMenuBtn = document.getElementById("admin-menu-btn")
const loginInfoPage = document.getElementById("login-info")
const loginInfoContent = document.getElementById("login-info-content")
const currentDateDisplay = document.getElementById("current-date-display")
const imageInput = document.getElementById("emotion-image")
const imagePreview = document.getElementById("image-preview")
const removeImageBtn = document.getElementById("remove-image")
const imageViewerPopup = document.getElementById("image-viewer-popup")
const imageViewer = document.getElementById("image-viewer")

// Camera elements
const takePhotoBtn = document.getElementById("take-photo-btn")
const cameraContainer = document.querySelector(".camera-container")
const cameraPreview = document.getElementById("camera-preview")
const capturePhotoBtn = document.getElementById("capture-photo")
const cancelCameraBtn = document.getElementById("cancel-camera")

// Camera stream reference
let cameraStream = null

// Current user and data
let currentUser = null
let userData = {}
let allUsersData = {}
let selectedUser = null
let selectedImage = null

// Initialize Firebase Storage
const storage = getStorage()

// Get current date in Indonesia timezone (WIB/GMT+7)
function getCurrentDateInWIB() {
  // Use the current date directly without timezone adjustment
  // This will use the local timezone of the user's device
  return new Date()
}

// Format date for display
function formatDate(date) {
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// Format date for display in Indonesian format
function formatDateIndonesian(date) {
  const day = date.getDate()
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ]
  const month = monthNames[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// Update current date display
function updateCurrentDateDisplay() {
  const wibDate = getCurrentDateInWIB()
  currentDateDisplay.textContent = formatDateIndonesian(wibDate)
}

// Check if user is already logged in
function checkLoggedInUser() {
  const savedUser = localStorage.getItem("currentUser")
  const rememberMe = localStorage.getItem("rememberMe") === "true"

  console.log("Checking logged in user:", savedUser, "Remember me:", rememberMe)

  if (savedUser && rememberMe) {
    console.log("User found in localStorage, logging in as:", savedUser)
    currentUser = savedUser
    loadUserData().then(() => {
      loadAllUsersData().then(() => {
        populateUserSelector()
        showApp()
        updateCurrentDateDisplay()

        // Tampilkan menu admin jika user adalah admin
        if (currentUser === "admin") {
          showAdminMenu()
        }
      })
    })
  }
}

// Login form submission - update to ensure each login is recorded
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const username = document.getElementById("username").value.toLowerCase()
  const password = document.getElementById("password").value
  const rememberMe = document.getElementById("remember-me").checked

  console.log("Login attempt:", username, "Remember me:", rememberMe)

  const user = validUsers.find((u) => u.username === username && u.password === password)

  if (user) {
    console.log("Login successful for user:", username)
    currentUser = username
    localStorage.setItem("currentUser", username)
    localStorage.setItem("rememberMe", rememberMe)

    try {
      // Record login with timestamp - this will create a new document for each login
      // even if it's the same user logging in multiple times
      await addDoc(collection(db, "loginLogs"), {
        username: username,
        timestamp: serverTimestamp(),
        device: navigator.userAgent, // Add device info
        loginTime: new Date().toLocaleString(), // Add human-readable time
      })
      console.log("Login log saved for:", username)
    } catch (error) {
      console.error("Error saving login log:", error)
    }

    await loadUserData()
    await loadAllUsersData()
    populateUserSelector()
    showApp()
    updateCurrentDateDisplay()
    console.log("App should be visible now")

    // Tampilkan menu admin jika user adalah admin
    if (currentUser === "admin") {
      showAdminMenu()
    }
  } else {
    // Show error message if login fails
    loginError.textContent = "Username atau password salah!"
    console.log("Login failed for user:", username)
  }
})

// Logout button
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("currentUser")
  localStorage.setItem("rememberMe", false)
  currentUser = null
  showLogin()

  // Sembunyikan menu admin saat logout
  if (adminMenuBtn) {
    adminMenuBtn.classList.add("hidden")
  }
})

// Navigation
navLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault()

    // Remove active class from all links
    navLinks.forEach((l) => l.classList.remove("active"))

    // Add active class to clicked link
    this.classList.add("active")

    // Hide all pages
    pages.forEach((page) => page.classList.add("hidden"))

    // Show selected page
    const pageId = this.getAttribute("data-page")
    document.getElementById(pageId).classList.remove("hidden")

    // If calendar page is selected, render calendar
    if (pageId === "kalender") {
      renderCalendar()
    }

    // Jika halaman login info dipilih, muat data login
    if (pageId === "login-info") {
      loadLoginInfo()
    }
  })
})

// Image input change handler
imageInput.addEventListener("change", function (e) {
  if (this.files && this.files[0]) {
    const file = this.files[0]
    selectedImage = file

    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.src = e.target.result
      imagePreview.classList.remove("hidden")
      removeImageBtn.classList.remove("hidden")
    }
    reader.readAsDataURL(file)
  }
})

// Remove image button
removeImageBtn.addEventListener("click", () => {
  imageInput.value = ""
  imagePreview.src = "#"
  imagePreview.classList.add("hidden")
  removeImageBtn.classList.add("hidden")
  selectedImage = null
})

// Take photo button
takePhotoBtn.addEventListener("click", async () => {
  try {
    // Request camera access
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment", // Use back camera if available
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })

    // Show camera preview
    cameraPreview.srcObject = cameraStream
    cameraContainer.classList.remove("hidden")

    console.log("Camera started successfully")
  } catch (error) {
    console.error("Error accessing camera:", error)
    alert("Tidak dapat mengakses kamera: " + error.message)
  }
})

// Capture photo button
capturePhotoBtn.addEventListener("click", () => {
  try {
    // Create canvas to capture the image
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    // Set canvas dimensions to match video
    canvas.width = cameraPreview.videoWidth
    canvas.height = cameraPreview.videoHeight

    // Draw video frame to canvas
    context.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height)

    // Convert canvas to data URL directly
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8)

    // Store the data URL for later use
    selectedImage = imageDataUrl

    // Display preview
    imagePreview.src = imageDataUrl
    imagePreview.classList.remove("hidden")
    removeImageBtn.classList.remove("hidden")

    // Stop camera and hide camera container
    stopCamera()

    console.log("Photo captured successfully")
  } catch (error) {
    console.error("Error capturing photo:", error)
    alert("Gagal mengambil foto: " + error.message)
  }
})

// Cancel camera button
cancelCameraBtn.addEventListener("click", () => {
  stopCamera()
})

// Function to stop camera stream
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop())
    cameraStream = null
  }

  cameraContainer.classList.add("hidden")
  cameraPreview.srcObject = null
}

// Stop camera when form is submitted
dailyForm.addEventListener("submit", () => {
  stopCamera()
})

// Stop camera when user navigates away
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    stopCamera()
  })
})

// Stop camera when user logs out
logoutBtn.addEventListener("click", () => {
  stopCamera()
})

// Close image viewer popup
document.querySelectorAll(".close-popup").forEach((button) => {
  button.addEventListener("click", function () {
    const popup = this.closest(".popup")
    if (popup) {
      popup.classList.add("hidden")
    }
  })
})

// Fungsi untuk menampilkan menu admin
function showAdminMenu() {
  const adminMenuBtn = document.getElementById("admin-menu-btn")
  if (adminMenuBtn) {
    adminMenuBtn.classList.remove("hidden")
  } else {
    console.error("Admin menu button tidak ditemukan!")
  }
}

// Fungsi untuk memuat informasi login
async function loadLoginInfo() {
  if (currentUser !== "admin") return

  const loginInfoContent = document.getElementById("login-info-content")
  if (!loginInfoContent) {
    console.error("Elemen login-info-content tidak ditemukan!")
    return
  }

  try {
    loginInfoContent.innerHTML = "<p>Memuat data login...</p>"

    // Ambil data login dari Firestore
    const q = query(collection(db, "loginLogs"), orderBy("timestamp", "desc"), limit(100))

    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      loginInfoContent.innerHTML = "<p>Tidak ada data login yang tersedia.</p>"
      return
    }

    // Buat tabel untuk menampilkan data
    let tableHTML = `
      <table class="login-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Waktu Login</th>
            <th>Perangkat</th>
          </tr>
        </thead>
        <tbody>
    `

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const username = data.username || "Unknown"
      const loginTime =
        data.loginTime || (data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : "Unknown")
      const device = data.device || "Unknown"

      tableHTML += `
        <tr>
          <td>${username}</td>
          <td>${loginTime}</td>
          <td class="device-info">${device}</td>
        </tr>
      `
    })

    tableHTML += `
        </tbody>
      </table>
    `

    loginInfoContent.innerHTML = tableHTML
  } catch (error) {
    console.error("Error loading login info:", error)
    loginInfoContent.innerHTML = `<p>Error: Gagal memuat data login. ${error.message}</p>`
  }
}

// User selector change
userSelector.addEventListener("change", function () {
  selectedUser = this.value
  renderCalendar()
})

// Populate user selector dropdown
function populateUserSelector() {
  userSelector.innerHTML = ""

  // Add option for all users
  const allOption = document.createElement("option")
  allOption.value = "all"
  allOption.textContent = "Semua Pengguna"
  userSelector.appendChild(allOption)

  // Add option for current user if not admin
  if (currentUser !== "admin") {
    const currentOption = document.createElement("option")
    currentOption.value = currentUser
    currentOption.textContent = currentUser
    userSelector.appendChild(currentOption)
  }

  // Add options for other users (excluding admin)
  validUsers.forEach((user) => {
    if (user.username !== currentUser && user.username !== "admin") {
      const option = document.createElement("option")
      option.value = user.username
      option.textContent = user.username
      userSelector.appendChild(option)
    }
  })

  // Default to current user or first non-admin user
  if (currentUser !== "admin") {
    selectedUser = currentUser
    userSelector.value = currentUser
  } else {
    // If current user is admin, default to "all"
    selectedUser = "all"
    userSelector.value = "all"
  }
}

// Star rating
stars.forEach((star) => {
  star.addEventListener("mouseover", function () {
    const rating = Number.parseInt(this.getAttribute("data-rating"))
    highlightStars(rating)
  })

  star.addEventListener("mouseout", () => {
    const currentRating = Number.parseInt(ratingInput.value) || 0
    highlightStars(currentRating)
  })

  star.addEventListener("click", function () {
    const rating = Number.parseInt(this.getAttribute("data-rating"))
    ratingInput.value = rating
    highlightStars(rating)

    // Show popup for low ratings (1-2)
    if (rating <= 2) {
      playlistPopup.classList.remove("hidden")
    }
  })
})

// Close popup
closePopup.addEventListener("click", () => {
  playlistPopup.classList.add("hidden")
})

// Close popup when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === playlistPopup) {
    playlistPopup.classList.add("hidden")
  }

  if (e.target === specialDatePopup) {
    specialDatePopup.classList.add("hidden")
  }

  if (e.target === imageViewerPopup) {
    imageViewerPopup.classList.add("hidden")
  }
})

// Store image in Firestore directly (bypass Firebase Storage)
async function storeImageInFirestore(imageDataUrl) {
  if (!imageDataUrl) return null

  try {
    // We'll store the image data URL directly in Firestore
    // This avoids CORS issues with Firebase Storage
    return imageDataUrl
  } catch (error) {
    console.error("Error storing image:", error)
    return null
  }
}

// Daily form submission
dailyForm.addEventListener("submit", async function (e) {
  e.preventDefault()

  // Check if required fields are filled
  const makanPagi = document.querySelector('input[name="makan-pagi"]:checked')
  const makanSiang = document.querySelector('input[name="makan-siang"]:checked')
  const makanMalam = document.querySelector('input[name="makan-malam"]:checked')
  const jajan = document.querySelector('input[name="jajan"]:checked')
  const rating = document.getElementById("rating-value").value

  if (!makanPagi || !makanSiang || !makanMalam || !jajan || !rating) {
    alert("Mohon lengkapi semua data yang diperlukan!")
    return
  }

  try {
    // Show loading indicator
    const submitBtn = this.querySelector('button[type="submit"]')
    const originalBtnText = submitBtn.textContent
    submitBtn.textContent = "Menyimpan..."
    submitBtn.disabled = true

    // Get form data
    const formData = new FormData(this)

    // Get current date in WIB timezone
    const wibDate = getCurrentDateInWIB()
    const today = formatDate(wibDate) // YYYY-MM-DD format

    // Process image if selected
    let imageURL = null
    if (selectedImage) {
      console.log("Processing image...")

      // If selectedImage is a File object (from file input)
      if (selectedImage instanceof File) {
        // Convert File to data URL
        const reader = new FileReader()
        imageURL = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result)
          reader.readAsDataURL(selectedImage)
        })
      } else if (typeof selectedImage === "string") {
        // If selectedImage is already a data URL (from camera)
        imageURL = selectedImage
      }

      // Store the image data URL
      console.log("Image processed successfully")
    }

    // Create entry object
    const entry = {
      makanPagi: formData.get("makan-pagi"),
      makanSiang: formData.get("makan-siang"),
      makanMalam: formData.get("makan-malam"),
      jajan: formData.get("jajan"),
      foods: Array.from(formData.getAll("food")),
      rating: Number.parseInt(formData.get("rating")),
      curhat: formData.get("curhat") || "", // Make curhat optional
      imageURL: imageURL, // Add image data URL
      date: today,
      user: currentUser,
      timestamp: new Date().toISOString(),
    }

    console.log("Saving entry:", entry)

    // Save to Firestore
    await setDoc(doc(db, "entries", `${currentUser}_${today}`), entry)

    // Update local data
    userData[today] = entry
    allUsersData[currentUser] = allUsersData[currentUser] || {}
    allUsersData[currentUser][today] = entry

    // Show success message
    alert("Data berhasil disimpan!")

    // Reset form
    this.reset()
    ratingInput.value = ""
    highlightStars(0)

    // Reset image preview
    imagePreview.src = "#"
    imagePreview.classList.add("hidden")
    removeImageBtn.classList.add("hidden")
    selectedImage = null

    // Restore button
    submitBtn.textContent = originalBtnText
    submitBtn.disabled = false
  } catch (error) {
    console.error("Error saving data:", error)
    alert("Gagal menyimpan data: " + error.message)

    // Restore button on error
    const submitBtn = this.querySelector('button[type="submit"]')
    submitBtn.textContent = "Simpan"
    submitBtn.disabled = false
  }
})

// Calendar navigation
let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()

prevMonthBtn.addEventListener("click", () => {
  currentMonth--
  if (currentMonth < 0) {
    currentMonth = 11
    currentYear--
  }
  renderCalendar()
})

nextMonthBtn.addEventListener("click", () => {
  currentMonth++
  if (currentMonth > 11) {
    currentMonth = 0
    currentYear++
  }
  renderCalendar()
})

// Helper Functions
function showLogin() {
  loginContainer.classList.remove("hidden")
  appContainer.classList.add("hidden")
}

function showApp() {
  console.log("Showing app, hiding login")
  loginContainer.classList.add("hidden")
  appContainer.classList.remove("hidden")
  userDisplay.textContent = `Halo, ${currentUser}!`
}

function highlightStars(rating) {
  stars.forEach((star) => {
    const starRating = Number.parseInt(star.getAttribute("data-rating"))
    if (starRating <= rating) {
      star.classList.add("active")
    } else {
      star.classList.remove("active")
    }
  })
}

async function loadUserData() {
  try {
    // Query Firestore for current user's entries
    const q = query(collection(db, "entries"), where("user", "==", currentUser))

    const querySnapshot = await getDocs(q)
    userData = {}

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      userData[data.date] = data
    })
  } catch (error) {
    console.error("Error loading user data:", error)
    userData = {}
  }
}

async function loadAllUsersData() {
  try {
    // Get all entries
    const querySnapshot = await getDocs(collection(db, "entries"))
    allUsersData = {}

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const user = data.user
      const date = data.date

      if (!allUsersData[user]) {
        allUsersData[user] = {}
      }

      allUsersData[user][date] = data
    })
  } catch (error) {
    console.error("Error loading all users data:", error)
    allUsersData = {}
  }
}

// Check if a date is the 11th of any month
function isSpecialDate(day, month, year) {
  return day === 11
}

// Check if a date is August 11th (anniversary)
function isAnniversaryDate(day, month, year) {
  return day === 11 && month === 7 // August is month 7 (0-indexed)
}

// Calculate months since April 11, 2025
function getMonthsSinceBreakup() {
  const breakupDate = new Date(2025, 3, 11) // April 11, 2025
  const now = new Date()

  const yearDiff = now.getFullYear() - breakupDate.getFullYear()
  const monthDiff = now.getMonth() - breakupDate.getMonth()

  return yearDiff * 12 + monthDiff
}

// Calculate years since 2022
function getYearsSinceAnniversary() {
  const anniversaryYear = 2022
  const currentYear = new Date().getFullYear()

  return currentYear - anniversaryYear
}

// Show special date popup
function showSpecialDatePopup(day, month, year) {
  if (isAnniversaryDate(day, month, year)) {
    // Anniversary date (August 11)
    const yearsSince = getYearsSinceAnniversary()
    specialDateTitle.textContent = "🎉 Hari Jadi Kita! 🎉"
    specialDateMessage.textContent = `Hi kita udah ${yearsSince} tahun ni, inget terus yaaa`
    celebrationAnimation.classList.remove("hidden")
  } else if (isSpecialDate(day, month, year)) {
    // Regular special date (11th of any month)
    const monthsSince = getMonthsSinceBreakup()
    specialDateTitle.textContent = "❤️ Tanggal 11 ❤️"
    specialDateMessage.textContent = `Hi ingat ga ya dee ktg putus tanggal ini, udah ${monthsSince} bulan`
    celebrationAnimation.classList.add("hidden")
  }

  specialDatePopup.classList.remove("hidden")
}

// Show image viewer popup
function showImageViewer(imageURL) {
  if (!imageURL) return

  imageViewer.src = imageURL
  imageViewerPopup.classList.remove("hidden")
}

function showDayDetails(dateString, day) {
  // Show day details section
  dayDetails.classList.remove("hidden")

  // Set selected date
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ]
  selectedDate.textContent = `${day} ${monthNames[currentMonth]} ${currentYear}`

  // Clear previous content
  dayContent.innerHTML = ""

  // Get entries for this date based on selected user
  const entries = []

  if (selectedUser === "all") {
    // Get all users' entries for this date
    for (const user in allUsersData) {
      if (allUsersData[user][dateString]) {
        entries.push({
          user: user,
          data: allUsersData[user][dateString],
        })
      }
    }
  } else {
    // Get only selected user's entry
    const userEntries = allUsersData[selectedUser] || {}
    if (userEntries[dateString]) {
      entries.push({
        user: selectedUser,
        data: userEntries[dateString],
      })
    }
  }

  if (entries.length > 0) {
    // Create content for each entry
    entries.forEach((entry, index) => {
      const data = entry.data
      const user = entry.user

      let entryContent = `
        <div class="day-entry">
          <h4>${user === currentUser ? "Aktivitas Kamu" : "Aktivitas " + user}</h4>
          <p>Makan Pagi: ${data.makanPagi === "ya" ? "✅" : "❌"}</p>
          <p>Makan Siang: ${data.makanSiang === "ya" ? "✅" : "❌"}</p>
          <p>Makan Malam: ${data.makanMalam === "ya" ? "✅" : "❌"}</p>
          <p>Jajan: ${data.jajan === "ya" ? "✅" : "❌"}</p>
      `

      if (data.foods && data.foods.length > 0) {
        entryContent += `
          <h4>Makanan yang Dipilih</h4>
          <ul>
            ${data.foods.map((food) => `<li>${food}</li>`).join("")}
          </ul>
        `
      }

      if (data.rating) {
        entryContent += `
          <h4>Rating Hari</h4>
          <div class="day-rating">
            ${Array(data.rating).fill("⭐").join("")}
          </div>
        `
      }

      if (data.curhat) {
        entryContent += `
          <h4>Curhat</h4>
          <div class="day-curhat">
            <p>${data.curhat}</p>
          </div>
        `
      }

      // Add image if available with responsive sizing
      if (data.imageURL) {
        entryContent += `
          <h4>Picture Your Emotion</h4>
          <div class="day-image">
            <img src="${data.imageURL}" alt="Emotion Picture" class="emotion-image">
          </div>
        `
      }

      entryContent += `</div>`

      // Add a separator between entries
      if (index < entries.length - 1) {
        entryContent += `<hr class="entry-separator">`
      }

      dayContent.innerHTML += entryContent
    })

    // Add click event to images
    const dayImages = dayContent.querySelectorAll(".day-image img")
    dayImages.forEach((img) => {
      img.addEventListener("click", function () {
        showImageViewer(this.src)
      })
    })
  } else {
    dayContent.innerHTML = "<p>Tidak ada data untuk tanggal ini.</p>"
  }
}

// Calendar rendering function
function renderCalendar() {
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const totalDays = lastDayOfMonth.getDate()
  const startDay = firstDayOfMonth.getDay() // 0 (Sunday) to 6 (Saturday)

  // Month names array
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ]

  // Update current month display
  currentMonthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`

  // Clear previous calendar
  calendarDays.innerHTML = ""

  // Add empty cells for the days before the first day of the month
  for (let i = 0; i < startDay; i++) {
    const emptyCell = document.createElement("div")
    emptyCell.classList.add("calendar-day", "empty")
    calendarDays.appendChild(emptyCell)
  }

  // Add days of the month
  for (let day = 1; day <= totalDays; day++) {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const calendarDay = document.createElement("div")
    calendarDay.classList.add("calendar-day")
    calendarDay.textContent = day

    // Check if the date is a special date
    if (isSpecialDate(day, currentMonth, currentYear) || isAnniversaryDate(day, currentMonth, currentYear)) {
      calendarDay.classList.add("special-date")
    }

    // Check if there is data for this day
    let hasData = false

    if (selectedUser === "all") {
      // Check if any user has data for this date
      for (const user in allUsersData) {
        if (allUsersData[user][dateString]) {
          hasData = true
          break
        }
      }
    } else {
      // Check if the selected user has data for this date
      const userEntries = allUsersData[selectedUser] || {}
      if (userEntries[dateString]) {
        hasData = true
      }
    }

    if (hasData) {
      calendarDay.classList.add("has-data")

      // Get the rating for this day and add the appropriate class
      let rating = 0

      if (selectedUser === "all") {
        // For "all" view, use the first entry with a rating
        for (const user in allUsersData) {
          if (allUsersData[user][dateString] && allUsersData[user][dateString].rating) {
            rating = allUsersData[user][dateString].rating
            break
          }
        }
      } else {
        // For specific user, get their rating
        const userEntries = allUsersData[selectedUser] || {}
        if (userEntries[dateString] && userEntries[dateString].rating) {
          rating = userEntries[dateString].rating
        }
      }

      // Add rating class if rating exists
      if (rating > 0) {
        calendarDay.classList.add(`rating-${rating}`)
      }
    }

    // Add click event to show day details
    calendarDay.addEventListener("click", () => {
      showDayDetails(dateString, day)
    })

    // Add click event to show special date popup
    calendarDay.addEventListener("dblclick", () => {
      showSpecialDatePopup(day, currentMonth, currentYear)
    })

    calendarDays.appendChild(calendarDay)
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded")

  // Check if elements exist
  if (!loginContainer) console.error("loginContainer not found")
  if (!appContainer) console.error("appContainer not found")
  if (!loginForm) console.error("loginForm not found")
  if (!userDisplay) console.error("userDisplay not found")

  // Close special date popup when clicking X
  document.querySelectorAll(".close-popup").forEach((btn) => {
    btn.addEventListener("click", () => {
      const popup = btn.closest(".popup")
      if (popup) {
        popup.classList.add("hidden")
      }
    })
  })

  // Tambahkan event listener untuk tombol menu admin
  const adminMenuBtn = document.getElementById("admin-menu-btn")
  if (adminMenuBtn) {
    adminMenuBtn.addEventListener("click", (e) => {
      e.preventDefault()

      // Remove active class from all links
      navLinks.forEach((l) => l.classList.remove("active"))

      // Hide all pages
      pages.forEach((page) => page.classList.add("hidden"))

      // Show login info page
      const loginInfoPage = document.getElementById("login-info")
      if (loginInfoPage) {
        loginInfoPage.classList.remove("hidden")
        // Load login info
        loadLoginInfo()
      } else {
        console.error("Halaman login info tidak ditemukan!")
      }
    })
  }

  // Update current date display
  updateCurrentDateDisplay()

  // Check for logged in user
  checkLoggedInUser()
})
