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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js"

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
  const now = new Date()
  // Add 7 hours to UTC to get WIB time
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wibTime
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

  // Add option for current user
  const currentOption = document.createElement("option")
  currentOption.value = currentUser
  currentOption.textContent = currentUser
  userSelector.appendChild(currentOption)

  // Add options for other users
  validUsers.forEach((user) => {
    if (user.username !== currentUser) {
      const option = document.createElement("option")
      option.value = user.username
      option.textContent = user.username
      userSelector.appendChild(option)
    }
  })

  // Default to current user
  selectedUser = currentUser
  userSelector.value = currentUser
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

// Upload image to Firebase Storage
async function uploadImage(file) {
  if (!file) return null

  try {
    const wibDate = getCurrentDateInWIB()
    const dateString = formatDate(wibDate)
    const fileName = `${currentUser}_${dateString}_${file.name}`
    const storageRef = ref(storage, `emotion_images/${fileName}`)

    // Upload file
    const snapshot = await uploadBytes(storageRef, file)
    console.log("Uploaded image successfully")

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log("Image URL:", downloadURL)

    return downloadURL
  } catch (error) {
    console.error("Error uploading image:", error)
    return null
  }
}

// Daily form submission
dailyForm.addEventListener("submit", async function (e) {
  e.preventDefault()

  // Get form data
  const formData = new FormData(this)

  // Get current date in WIB timezone
  const wibDate = getCurrentDateInWIB()
  const today = formatDate(wibDate) // YYYY-MM-DD format

  // Upload image if selected
  let imageURL = null
  if (selectedImage) {
    imageURL = await uploadImage(selectedImage)
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
    imageURL: imageURL, // Add image URL
    date: today,
    user: currentUser,
    timestamp: new Date().toISOString(),
  }

  try {
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
  } catch (error) {
    console.error("Error saving data:", error)
    alert("Gagal menyimpan data: " + error.message)
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

function renderCalendar() {
  // Update month and year display
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
  currentMonthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`

  // Clear previous calendar
  calendarDays.innerHTML = ""

  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  // Add empty cells for days before first day of month
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div")
    calendarDays.appendChild(emptyDay)
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div")
    dayElement.classList.add("calendar-day")
    dayElement.textContent = day

    // Format date string
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

    // Check if day has entry based on selected user
    let hasEntry = false
    let rating = 0
    let hasImage = false

    if (selectedUser === "all") {
      // Check all users for entries on this date
      for (const user in allUsersData) {
        if (allUsersData[user][dateString]) {
          hasEntry = true
          // Use the highest rating if multiple users have entries
          const userRating = allUsersData[user][dateString].rating || 0
          rating = Math.max(rating, userRating)

          // Check if any user has an image for this date
          if (allUsersData[user][dateString].imageURL) {
            hasImage = true
          }
        }
      }
    } else {
      // Check only selected user
      const userEntries = allUsersData[selectedUser] || {}
      if (userEntries[dateString]) {
        hasEntry = true
        rating = userEntries[dateString].rating || 0

        // Check if selected user has an image for this date
        if (userEntries[dateString].imageURL) {
          hasImage = true
        }
      }
    }

    if (hasEntry) {
      dayElement.classList.add("has-entry")

      // Add color based on rating
      if (rating) {
        dayElement.classList.add(`rating-${rating}`)
      }

      // Add image indicator if day has image
      if (hasImage) {
        dayElement.classList.add("has-image")
      }
    }

    // Check if this is a special date (11th of any month)
    if (isSpecialDate(day, currentMonth, currentYear)) {
      dayElement.classList.add("special-date")

      // Check if this is an anniversary date (August 11th)
      if (isAnniversaryDate(day, currentMonth, currentYear)) {
        dayElement.classList.add("anniversary-date")

        // Add celebration animation
        const highlight = document.createElement("div")
        highlight.classList.add("anniversary-highlight")
        dayElement.appendChild(highlight)
      }
    }

    // Add click event to show day details
    dayElement.addEventListener("click", () => {
      // Show regular day details
      showDayDetails(dateString, day)

      // If it's a special date, also show the special popup
      if (isSpecialDate(day, currentMonth, currentYear)) {
        showSpecialDatePopup(day, currentMonth, currentYear)
      }
    })

    calendarDays.appendChild(dayElement)
  }
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

      // Add image if available
      if (data.imageURL) {
        entryContent += `
          <h4>Picture Your Emotion</h4>
          <div class="day-image">
            <img src="${data.imageURL}" alt="Emotion Picture" onclick="showImageViewer('${data.imageURL}')">
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
