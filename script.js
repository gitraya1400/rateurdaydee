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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

// User credentials - simple username/password pairs
const validUsers = [
  { username: "icha", password: "110406" },
  { username: "raya", password: "140405" },
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

// Current user and data
let currentUser = null
let userData = {}
let allUsersData = {}
let selectedUser = null
const currentDate = new Date()
let currentMonth = currentDate.getMonth()
let currentYear = currentDate.getFullYear()

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
      })
    })
  }
}

// Login form submission
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
      await addDoc(collection(db, "loginLogs"), {
        username: username,
        timestamp: serverTimestamp()
      })
      console.log("Login log berhasil ditambah!")
    } catch (error) {
      console.error("Error saat tambah login log:", error)
    }

    await loadUserData()
    await loadAllUsersData()
    populateUserSelector()
    showApp()
  } else {
    loginError.textContent = "Username atau password salah!"
    setTimeout(() => {
      loginError.textContent = ""
    }, 3000)
  }
})

// Logout button
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("currentUser")
  localStorage.setItem("rememberMe", false)
  currentUser = null
  showLogin()
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
  })
})

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
})

// Daily form submission
dailyForm.addEventListener("submit", async function (e) {
  e.preventDefault()

  // Get form data
  const formData = new FormData(this)
  const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD format

  // Create entry object
  const entry = {
    makanPagi: formData.get("makan-pagi"),
    makanSiang: formData.get("makan-siang"),
    makanMalam: formData.get("makan-malam"),
    jajan: formData.get("jajan"),
    foods: Array.from(formData.getAll("food")),
    rating: Number.parseInt(formData.get("rating")),
    curhat: formData.get("curhat"), // <-- Tambahan ini
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
  } catch (error) {
    console.error("Error saving data:", error)
    alert("Gagal menyimpan data: " + error.message)
  }
})

// Calendar navigation
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

    if (selectedUser === "all") {
      // Check all users for entries on this date
      for (const user in allUsersData) {
        if (allUsersData[user][dateString]) {
          hasEntry = true
          // Use the highest rating if multiple users have entries
          const userRating = allUsersData[user][dateString].rating || 0
          rating = Math.max(rating, userRating)
        }
      }
    } else {
      // Check only selected user
      const userEntries = allUsersData[selectedUser] || {}
      if (userEntries[dateString]) {
        hasEntry = true
        rating = userEntries[dateString].rating || 0
      }
    }

    if (hasEntry) {
      dayElement.classList.add("has-entry")

      // Add color based on rating
      if (rating) {
        dayElement.classList.add(`rating-${rating}`)
      }
    }

    // Add click event to show day details
    dayElement.addEventListener("click", () => {
      showDayDetails(dateString, day)
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

      entryContent += `</div>`

      // Add a separator between entries
      if (index < entries.length - 1) {
        entryContent += `<hr class="entry-separator">`
      }

      dayContent.innerHTML += entryContent
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

  checkLoggedInUser()
})
