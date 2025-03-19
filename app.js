// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    const loggedInUser = localStorage.getItem("loggedInUser");
    const loginTime = localStorage.getItem("loginTime");
    const path = window.location.pathname;

    if (!path.includes("index.html") && (!loggedInUser || !loginTime)) {
        window.location.href = "/HotelBilling/index.html";
    } else if (loggedInUser && loginTime) {
        const timeElapsed = Date.now() - parseInt(loginTime);
        const twelveHours = 12 * 60 * 60 * 1000;
        if (timeElapsed >= twelveHours) {
            logout();
        } else {
            if (document.getElementById("user")) document.getElementById("user").textContent = loggedInUser;
            startTimer(twelveHours - timeElapsed);
            setupNavigation();
            setupSidebarToggle();
            if (path.includes("dashboard.html")) {
                loadTables();
                loadMenu();
                setupInputs();
            } else if (path.includes("tables.html")) {
                loadTables();
                setupTableManagement();
            } else if (path.includes("waiters.html")) {
                loadWaiters();
            } else if (path.includes("menu.html")) {
                loadMenu();
                setupMenuForm();
            } else if (path.includes("reports.html")) {
                loadReports();
                loadReportInsights();
            }
        }
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            if (username === "admin" && password === "password123") {
                localStorage.setItem("loggedInUser", username);
                localStorage.setItem("loginTime", Date.now());
                window.location.href = "/Hotelbilling/dashboard.html";
            } else {
                document.getElementById("error").textContent = "Invalid credentials!";
            }
        });
    }
});

// Logout
const logoutBtns = document.querySelectorAll("#logoutBtn");
logoutBtns.forEach(btn => btn.addEventListener("click", logout));

function logout() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loginTime");
    window.location.href = "/HotelBilling/index.html";
}

// Timer
function startTimer(remainingTime) {
    const timerDisplay = document.getElementById("timer");
    if (!timerDisplay) return;
    let timeLeft = remainingTime;
    const interval = setInterval(() => {
        timeLeft -= 1000;
        if (timeLeft <= 0) {
            clearInterval(interval);
            logout();
        } else {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            timerDisplay.textContent = `${hours}h ${minutes}m ${seconds}s`;
        }
    }, 1000);
}

// Navigation Setup
function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";

    navItems.forEach(item => {
        item.classList.remove("active");
        const href = item.getAttribute("href") || item.getAttribute("onclick");
        if (href && (href.includes(currentPath) || (currentPath === "dashboard.html" && href.includes("dashboard.html")))) {
            item.classList.add("active");
        }

        item.addEventListener("click", (e) => {
            if (item.id !== "logoutBtn") {
                navItems.forEach(nav => nav.classList.remove("active"));
                item.classList.add("active");
            }
        });
    });
}

// Sidebar Toggle
function setupSidebarToggle() {
    const toggleBtn = document.getElementById("toggleSidebar");
    const sidebar = document.getElementById("sidebar");

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("hidden");
        });
    }
}

// Table Management
let tables = JSON.parse(localStorage.getItem("tables")) || [];
let currentTable = null;

// [Existing loadTables, getTableStatus, selectTable, filterTables, setupTableManagement, editTable, saveTableEdit, deleteTable remain unchanged]

// Menu System
let menu = JSON.parse(localStorage.getItem("menu")) || [];

// [Existing loadMenu, setupMenuForm, editMenuItem, saveMenuEdit remain unchanged]

// Input Handling
let highlightedIndex = -1;

// [Existing setupInputs, updateHighlight, loadOrder, updateGrandTotal, saveOrder, generateBillNumber, printReceipt, closeDay remain unchanged]

// Reports
function loadReports() {
    const orderHistory = JSON.parse(localStorage.getItem("orderHistory")) || [];
    const dailyReports = JSON.parse(localStorage.getItem("dailyReports")) || [];
    const reportList = document.getElementById("reportList");
    const filterType = document.getElementById("filterType");
    const filterValue = document.getElementById("filterValue");
    const applyFilterBtn = document.getElementById("applyFilter");
    const searchBillInput = document.getElementById("searchBill");
    const searchBillBtn = document.getElementById("searchBillBtn");

    if (!reportList || !filterType || !filterValue || !applyFilterBtn || !searchBillInput || !searchBillBtn) {
        console.error("One or more report elements are missing in the DOM.");
        return;
    }

    console.log("Initial orderHistory:", orderHistory);
    console.log("Initial dailyReports:", dailyReports);

    function displayOrders(orders) {
        if (orders.length === 0) {
            reportList.innerHTML = `<p class="text-gray-500">No orders found.</p>`;
            console.log("No orders to display.");
            return;
        }
        reportList.innerHTML = orders
            .map(order => `
                <div class="report-item">
                    <p><strong class="text-indigo-600">Bill Number:</strong> ${order.billNumber || 'N/A'}</p>
                    <p><strong class="text-indigo-600">Table:</strong> ${order.table}</p>
                    <p><strong class="text-indigo-600">Date:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
                    <p><strong class="text-indigo-600">Items:</strong> ${order.items.map(item => `${item.name} (${item.code}) x${item.qty} - $${(item.price * item.qty).toFixed(2)}`).join(", ")}</p>
                    <p><strong class="text-indigo-600">Total:</strong> $${order.total}</p>
                    <hr class="my-2 border-gray-300">
                </div>`)
            .join("");
        console.log("Orders displayed:", orders);
    }

    function displayDailyReports(reports) {
        if (reports.length === 0) {
            reportList.innerHTML = `<p class="text-gray-500">No daily reports found.</p>`;
            console.log("No daily reports to display.");
            return;
        }
        reportList.innerHTML = reports
            .map(report => `
                <div class="report-item">
                    <p><strong class="text-indigo-600">Date:</strong> ${new Date(report.date).toLocaleDateString()}</p>
                    <p><strong class="text-indigo-600">Total Sales:</strong> $${report.totalSales}</p>
                    <p><strong class="text-indigo-600">Items Sold:</strong> ${Object.entries(report.itemsSold)
                        .map(([item, qty]) => `${item} x${qty}`).join(", ")}</p>
                    <hr class="my-2 border-gray-300">
                </div>`)
            .join("");
        console.log("Daily reports displayed:", reports);
    }

    displayOrders(orderHistory);

    applyFilterBtn.addEventListener("click", () => {
        const type = filterType.value;
        const value = filterValue.value;
        let filteredOrders = [...orderHistory];
        let filteredDailyReports = [...dailyReports];

        console.log("Applying filter - Type:", type, "Value:", value);

        if (type === "day" && value) {
            filteredOrders = filteredOrders.filter(order => new Date(order.date).toLocaleDateString() === new Date(value).toLocaleDateString());
            displayOrders(filteredOrders);
            loadReportInsights(filteredOrders);
        } else if (type === "month" && value) {
            const [year, month] = value.split('-');
            filteredOrders = filteredOrders.filter(order => {
                const d = new Date(order.date);
                return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
            });
            displayOrders(filteredOrders);
            loadReportInsights(filteredOrders);
        } else if (type === "range" && value) {
            const [start, end] = value.split(' to ');
            filteredOrders = filteredOrders.filter(order => {
                const d = new Date(order.date);
                const startDate = new Date(start);
                const endDate = new Date(end);
                return d >= startDate && d <= endDate;
            });
            displayOrders(filteredOrders);
            loadReportInsights(filteredOrders);
        } else if (type === "daily") {
            displayDailyReports(filteredDailyReports);
            loadReportInsights(orderHistory); // Use full order history for daily insights
        } else {
            displayOrders(orderHistory);
            loadReportInsights(orderHistory);
        }
    });

    searchBillBtn.addEventListener("click", () => {
        const billNumber = searchBillInput.value.trim();
        console.log("Searching for bill number:", billNumber);
        if (billNumber) {
            const filteredOrders = orderHistory.filter(order => order.billNumber === billNumber);
            if (filteredOrders.length > 0) {
                displayOrders(filteredOrders);
                loadReportInsights(filteredOrders);
            } else {
                reportList.innerHTML = `<p class="text-gray-500">No orders found for bill number: ${billNumber}</p>`;
                document.getElementById("insightsDetails").innerHTML = "";
            }
        } else {
            displayOrders(orderHistory);
            loadReportInsights(orderHistory);
        }
    });

    // PDF Export Button
    const exportPdfBtn = document.getElementById("exportPdfBtn");
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", () => {
            exportToPdf(orderHistory); // Export all orders by default
        });
    }
}

function loadReportInsights(orders) {
    const insightsDetails = document.getElementById("insightsDetails");
    if (!insightsDetails) return;

    if (orders.length === 0) {
        insightsDetails.innerHTML = "<p class='text-gray-500'>No data for insights.</p>";
        return;
    }

    // Most Sold Item
    const itemSales = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            const key = `${item.name} (${item.code})`;
            itemSales[key] = (itemSales[key] || 0) + item.qty;
        });
    });
    const mostSoldItem = Object.entries(itemSales).reduce((a, b) => a[1] > b[1] ? a : b, [0, 0]);
    const mostSoldItemName = mostSoldItem[0];
    const mostSoldItemQty = mostSoldItem[1];

    // Table with Most Customers
    const tableCounts = {};
    orders.forEach(order => {
        tableCounts[order.table] = (tableCounts[order.table] || 0) + 1;
    });
    const busiestTable = Object.entries(tableCounts).reduce((a, b) => a[1] > b[1] ? a : b, [0, 0]);
    const busiestTableName = busiestTable[0];
    const busiestTableCount = busiestTable[1];

    // Total Amount
    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total), 0).toFixed(2);

    insightsDetails.innerHTML = `
        <p class="mb-2"><strong class="text-indigo-600">Most Sold Item:</strong> ${mostSoldItemName} (x${mostSoldItemQty})</p>
        <p class="mb-2"><strong class="text-indigo-600">Busiest Table:</strong> ${busiestTableName} (Customers: ${busiestTableCount})</p>
        <p class="mb-2"><strong class="text-indigo-600">Total Amount:</strong> $${totalAmount}</p>
    `;
}

function exportToPdf(orders) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(18);
    doc.text("Restaurant Billing Report", 105, y, { align: "center" });
    y += 10;

    // Total Amount
    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total), 0).toFixed(2);
    doc.setFontSize(12);
    doc.text(`Total Amount: $${totalAmount}`, 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(14);
    doc.text("Order Details", 105, y, { align: "center" });
    y += 10;

    orders.forEach((order, index) => {
        y += 5;
        if (y > 280) {
            doc.addPage();
            y = 10;
        }
        doc.text(`Bill Number: ${order.billNumber || 'N/A'}`, 10, y);
        y += 5;
        doc.text(`Table: ${order.table}`, 10, y);
        y += 5;
        doc.text(`Date: ${new Date(order.timestamp).toLocaleString()}`, 10, y);
        y += 5;
        doc.text(`Items: ${order.items.map(item => `${item.name} (${item.code}) x${item.qty} - $${(item.price * item.qty).toFixed(2)}`).join(", ")}`, 10, y);
        y += 5;
        doc.text(`Total: $${order.total}`, 10, y);
        y += 10;
        if (index < orders.length - 1) doc.text("-----------------", 10, y);
        y += 5;
    });

    doc.save("restaurant_report.pdf");
}

// Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/HotelBilling/sw.js").then(() => {
        console.log("Service Worker registered");
    });
}
