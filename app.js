// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    const loggedInUser = localStorage.getItem("loggedInUser");
    const loginTime = localStorage.getItem("loginTime");
    const path = window.location.pathname;

    if (!path.includes("index.html") && (!loggedInUser || !loginTime)) {
        window.location.href = "index.html";
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
                window.location.href = "dashboard.html";
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
    window.location.href = "index.html";
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

function loadTables() {
    const tableGrid = document.getElementById("tableGrid");
    const tableList = document.getElementById("tableList");
    tables = JSON.parse(localStorage.getItem("tables")) || [];

    console.log("Loading tables:", tables);

    if (tableGrid) {
        if (tables.length === 0) {
            tableGrid.innerHTML = `<p>No tables available. Set up tables in tables.html</p>`;
            console.log("No tables found in localStorage, showing message.");
        } else {
            tableGrid.innerHTML = tables
                .map(table => `
                    <div class="table-item ${currentTable === table.name ? 'selected' : ''}" 
                         onclick="selectTable('${table.name}')">
                        <span class="table-icon ${getTableStatus(table.name) === 'occupied' ? 'occupied' : 'free'}">
                            <i class="fas fa-utensils"></i>
                        </span>
                        <span class="table-name">${table.name}</span>
                    </div>`)
                .join("");
            filterTables(document.getElementById("tableInput")?.value || "");
            console.log("Tables loaded into grid:", tableGrid.innerHTML);
        }
    }

    if (tableList) {
        if (tables.length === 0) {
            tableList.innerHTML = `<p>No tables available. Generate tables below.</p>`;
        } else {
            tableList.innerHTML = tables
                .map((table, index) => `
                    <div class="table-item-row">
                        <span>${table.name} (${table.type})</span>
                        <button class="btn btn-small btn-primary" onclick="editTable(${index})">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="deleteTable(${index})">Delete</button>
                    </div>`)
                .join("");
        }
    }
}

function getTableStatus(tableName) {
    const order = JSON.parse(localStorage.getItem(`order_${tableName}`)) || [];
    return order.length > 0 ? "occupied" : "free";
}

function selectTable(tableName) {
    currentTable = tableName;
    const table = tables.find(t => t.name === tableName);
    const currentTableInfo = document.getElementById("currentTableInfo");
    const itemInput = document.getElementById("itemInput");

    if (currentTableInfo) {
        currentTableInfo.innerHTML = table ? `
            <p><strong>Table:</strong> ${table.name} (${table.type})</p>
            <p><strong>Status:</strong> ${getTableStatus(table.name) === "occupied" ? "Occupied" : "Free"}</p>
        ` : "";
    }
    loadOrder(tableName);
    if (itemInput) itemInput.focus();
    loadTables();
}

function filterTables(query) {
    const tableGrid = document.getElementById("tableGrid");
    if (tableGrid && tables.length > 0) {
        const filteredTables = tables.filter(table =>
            table.name.toLowerCase().includes(query.toLowerCase())
        );
        tableGrid.innerHTML = filteredTables.length > 0 ? filteredTables
            .map(table => `
                <div class="table-item ${currentTable === table.name ? 'selected' : ''}" 
                     onclick="selectTable('${table.name}')">
                    <span class="table-icon ${getTableStatus(table.name) === 'occupied' ? 'occupied' : 'free'}">
                        <i class="fas fa-utensils"></i>
                    </span>
                    <span class="table-name">${table.name}</span>
                </div>`)
            .join("") : `<p>No matching tables</p>`;
        console.log("Filtered tables:", filteredTables);
    }
}

function setupTableManagement() {
    const generateTablesBtn = document.getElementById("generateTables");
    const tableCount = document.getElementById("tableCount");

    if (generateTablesBtn) {
        generateTablesBtn.addEventListener("click", () => {
            const count = parseInt(tableCount.value) || 0;
            if (count > 0) {
                tables = [];
                for (let i = 1; i <= count; i++) {
                    tables.push({ name: `Table ${i}`, type: "Regular" });
                }
                localStorage.setItem("tables", JSON.stringify(tables));
                loadTables();
                tableCount.value = "";
            } else {
                alert("Please enter a valid number of tables!");
            }
        });
    }
}

function editTable(index) {
    const table = tables[index];
    const tableList = document.getElementById("tableList");
    if (tableList) {
        tableList.innerHTML = `
            <div class="table-edit form-grid">
                <input type="text" id="editTableName" value="${table.name}" required>
                <input type="text" id="editTableType" value="${table.type}" required>
                <button onclick="saveTableEdit(${index})" class="btn btn-success">Save</button>
                <button onclick="loadTables()" class="btn btn-secondary">Cancel</button>
            </div>`;
    }
}

function saveTableEdit(index) {
    const newName = document.getElementById("editTableName").value;
    const newType = document.getElementById("editTableType").value;
    tables[index] = { name: newName, type: newType };
    localStorage.setItem("tables", JSON.stringify(tables));
    loadTables();
}

function deleteTable(index) {
    if (confirm("Are you sure you want to delete this table?")) {
        tables.splice(index, 1);
        localStorage.setItem("tables", JSON.stringify(tables));
        loadTables();
    }
}

// Menu System
let menu = JSON.parse(localStorage.getItem("menu")) || [];

function loadMenu() {
    const menuList = document.getElementById("menuList");
    if (menuList) {
        menuList.innerHTML = menu
            .map((m, index) => `
                <div class="menu-item">
                    ${m.code} - ${m.name} - $${m.price.toFixed(2)}
                    <button onclick="editMenuItem(${index})" class="btn btn-small btn-primary">Edit</button>
                </div>`)
            .join("");
    }
}

function setupMenuForm() {
    const menuForm = document.getElementById("menuForm");
    if (menuForm) {
        menuForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const item = {
                code: document.getElementById("itemCode").value,
                name: document.getElementById("itemNameMenu").value,
                price: parseFloat(document.getElementById("itemPriceMenu").value)
            };
            menu.push(item);
            localStorage.setItem("menu", JSON.stringify(menu));
            loadMenu();
            menuForm.reset();
        });
    }
}

function editMenuItem(index) {
    const item = menu[index];
    const menuList = document.getElementById("menuList");
    if (menuList) {
        menuList.innerHTML = `
            <div class="menu-edit form-grid">
                <input type="text" id="editItemCode" value="${item.code}" required>
                <input type="text" id="editItemName" value="${item.name}" required>
                <input type="number" id="editItemPrice" value="${item.price}" step="0.01" required>
                <button onclick="saveMenuEdit(${index})" class="btn btn-success">Save</button>
            </div>`;
    }
}

function saveMenuEdit(index) {
    const newCode = document.getElementById("editItemCode").value;
    const newName = document.getElementById("editItemName").value;
    const newPrice = parseFloat(document.getElementById("editItemPrice").value);
    menu[index] = { code: newCode, name: newName, price: newPrice };
    localStorage.setItem("menu", JSON.stringify(menu));
    loadMenu();
}

// Input Handling
let highlightedIndex = -1;

function setupInputs() {
    const tableInput = document.getElementById("tableInput");
    const itemInput = document.getElementById("itemInput");
    const itemQty = document.getElementById("itemQty");
    const currentTableInfo = document.getElementById("currentTableInfo");
    const suggestions = document.getElementById("suggestions");

    if (!tableInput || !itemInput || !itemQty || !currentTableInfo || !suggestions) {
        console.error("One or more input elements are missing in the DOM.");
        return;
    }

    tableInput.addEventListener("input", () => {
        filterTables(tableInput.value);
    });

    tableInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const matchedTable = tables.find(t => t.name.toLowerCase() === tableInput.value.toLowerCase());
            if (matchedTable) {
                selectTable(matchedTable.name);
                tableInput.value = "";
                itemInput.focus();
            } else {
                alert("Table not found!");
            }
        }
    });

    itemInput.addEventListener("input", () => {
        const query = itemInput.value.toLowerCase();
        highlightedIndex = -1;

        if (query && currentTable) {
            const filteredItems = menu.filter(item =>
                item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query)
            );
            suggestions.innerHTML = filteredItems
                .map((item, index) => `
                    <div class="suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}" 
                         onclick="selectItem('${item.code}')">
                        ${item.code} - ${item.name} - $${item.price.toFixed(2)}
                    </div>`)
                .join("");
            suggestions.style.display = filteredItems.length ? "block" : "none";
        } else {
            suggestions.innerHTML = "";
            suggestions.style.display = "none";
        }
    });

    itemInput.addEventListener("keydown", (e) => {
        const items = suggestions.querySelectorAll(".suggestion-item");
        if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && items.length > 0) {
                const code = items[highlightedIndex].getAttribute("onclick").match(/'([^']+)'/)[1];
                selectItem(code);
            } else {
                const query = itemInput.value.toLowerCase();
                const matchedItem = menu.find(item =>
                    item.code.toLowerCase() === query || item.name.toLowerCase() === query
                );
                if (matchedItem) {
                    selectItem(matchedItem.code);
                } else {
                    alert("Item not found! Use arrow keys or click to select from suggestions.");
                }
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
            updateHighlight(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, -1);
            updateHighlight(items);
        }
    });

    document.addEventListener("click", (e) => {
        if (!itemInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = "none";
        }
    });

    function selectItem(code) {
        const item = menu.find(m => m.code === code);
        if (item) {
            currentTableInfo.innerHTML += `<p>Selected Item: ${item.name} (${item.code}) - $${item.price.toFixed(2)}</p>`;
            itemInput.value = "";
            suggestions.style.display = "none";
            itemQty.focus();
            // Hide sidebar on item selection
            const sidebar = document.getElementById("sidebar");
            if (sidebar) {
                sidebar.classList.add("hidden");
            }
        }
    }

    itemQty.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && currentTable) {
            const qty = parseInt(itemQty.value) || 1;
            const selectedItemInfo = currentTableInfo.innerHTML.match(/Selected Item: ([\w\s]+) \((\w+)\) - \$([\d.]+)/);
            if (selectedItemInfo) {
                const name = selectedItemInfo[1];
                const code = selectedItemInfo[2];
                const price = parseFloat(selectedItemInfo[3]);
                const item = { name, code, price, qty };
                let currentOrder = JSON.parse(localStorage.getItem(`order_${currentTable}`)) || [];
                currentOrder.push(item);
                localStorage.setItem(`order_${currentTable}`, JSON.stringify(currentOrder));
                loadOrder(currentTable);
                currentTableInfo.innerHTML = currentTableInfo.innerHTML.replace(/<p>Selected Item: [\w\s]+ \(\w+\) - \$[\d.]+<\/p>/, "");
                itemQty.value = "";
                itemInput.focus();
            }
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "PageDown" && currentTable) {
            e.preventDefault();
            saveOrder();
            currentTable = null;
            const currentTableInfo = document.getElementById("currentTableInfo");
            currentTableInfo.innerHTML = "";
            document.getElementById("orderList").innerHTML = "";
            document.getElementById("grandTotal").textContent = "0.00";
            tableInput.focus();
            loadTables();
        } else if (e.key === "PageUp" && currentTable) {
            e.preventDefault();
            printReceipt();
        } else if (e.key === "End") {
            e.preventDefault();
            closeDay();
        }
    });
}

function updateHighlight(items) {
    items.forEach((item, index) => {
        item.classList.toggle("highlighted", index === highlightedIndex);
        if (index === highlightedIndex) {
            item.scrollIntoView({ block: "nearest" });
        }
    });
}

function loadOrder(tableName) {
    currentTable = tableName;
    const currentOrder = JSON.parse(localStorage.getItem(`order_${tableName}`)) || [];
    const orderList = document.getElementById("orderList");
    const currentTableInfo = document.getElementById("currentTableInfo");
    const table = tables.find(t => t.name === tableName);

    if (currentTableInfo) {
        currentTableInfo.innerHTML = table ? `
            <p><strong>Table:</strong> ${table.name} (${table.type})</p>
            <p><strong>Status:</strong> ${getTableStatus(table.name) === "occupied" ? "Occupied" : "Free"}</p>
        ` : "";
    }
    if (orderList) {
        orderList.innerHTML = currentOrder
            .map((item, index) => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>${item.qty}</td>
                    <td>${(item.price * item.qty).toFixed(2)}</td>
                </tr>
            `)
            .join("");
        updateGrandTotal(currentOrder);
    }
}

function updateGrandTotal(order) {
    const total = order.reduce((sum, item) => sum + item.price * item.qty, 0);
    const grandTotalElement = document.getElementById("grandTotal");
    if (grandTotalElement) {
        grandTotalElement.textContent = total.toFixed(2);
    }
}

function saveOrder() {
    if (currentTable) {
        const currentOrder = JSON.parse(localStorage.getItem(`order_${currentTable}`)) || [];
        if (currentOrder.length > 0) {
            localStorage.setItem(`order_${currentTable}`, JSON.stringify(currentOrder));
        }
    }
}

// Generate Unique Bill Number
function generateBillNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `BILL-${timestamp}-${random}`;
}

function printReceipt() {
    if (!currentTable) {
        alert("No table selected!");
        return;
    }
    const currentOrder = JSON.parse(localStorage.getItem(`order_${currentTable}`)) || [];
    if (currentOrder.length === 0) {
        alert("No order to generate receipt for!");
        return;
    }

    const total = currentOrder.reduce((sum, item) => sum + item.price * item.qty, 0);
    const billNumber = generateBillNumber();
    const timestamp = new Date().toISOString();
    const restaurantName = "Sample Restaurant";

    // Save order details to history with debugging
    const orderDetails = {
        billNumber: billNumber,
        table: currentTable,
        items: [...currentOrder], // Create a copy to avoid reference issues
        total: total.toFixed(2),
        timestamp: timestamp,
        date: timestamp.split('T')[0]
    };

    console.log("Saving order to history:", orderDetails);

    let orderHistory = JSON.parse(localStorage.getItem("orderHistory")) || [];
    orderHistory.push(orderDetails);
    localStorage.setItem("orderHistory", JSON.stringify(orderHistory));
    console.log("Updated orderHistory in localStorage:", orderHistory);

    const receipt = `
        ${restaurantName}
        Restaurant Billing Receipt
        Bill Number: ${billNumber}
        Table: ${currentTable}
        Date: ${new Date().toLocaleString()}
        -----------------------
        ${currentOrder.map(item => `${item.name} (${item.code}) x${item.qty} - $${(item.price * item.qty).toFixed(2)}`).join("\n")}
        -----------------------
        Grand Total: $${total.toFixed(2)}
    `;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<pre>' + receipt + '</pre>');
    printWindow.document.close();
    printWindow.print();
    printWindow.close();

    // Clear the current table order after printing
    localStorage.removeItem(`order_${currentTable}`);
    loadOrder(currentTable);
    const currentTableInfo = document.getElementById("currentTableInfo");
    currentTableInfo.innerHTML = currentTable ? `
        <p><strong>Table:</strong> ${currentTable} (Regular)</p>
        <p><strong>Status:</strong> Free</p>
    ` : "";
}

function closeDay() {
    const reports = JSON.parse(localStorage.getItem("dailyReports")) || [];
    const today = new Date().toISOString().split('T')[0];
    let dailyTotal = 0;
    let itemSales = {};

    tables.forEach(table => {
        const order = JSON.parse(localStorage.getItem(`order_${table.name}`)) || [];
        if (order.length > 0) {
            const tableTotal = order.reduce((sum, item) => sum + item.price * item.qty, 0);
            dailyTotal += tableTotal;
            order.forEach(item => {
                const key = `${item.name} (${item.code})`;
                itemSales[key] = (itemSales[key] || 0) + item.qty;
            });
            localStorage.removeItem(`order_${table.name}`);
        }
    });

    const report = {
        date: today,
        totalSales: dailyTotal.toFixed(2),
        itemsSold: itemSales,
        timestamp: new Date().toISOString()
    };
    reports.push(report);
    localStorage.setItem("dailyReports", JSON.stringify(reports));

    loadTables();
    alert(`Day closed for ${today}. Total Sales: $${dailyTotal.toFixed(2)}. Reports saved.`);
}

// Generate Receipt
const generateReceiptBtn = document.getElementById("generateReceipt");
if (generateReceiptBtn) {
    generateReceiptBtn.addEventListener("click", () => {
        if (!currentTable) {
            alert("No table selected!");
            return;
        }
        printReceipt();
    });
}

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

    console.log("Loading orderHistory:", orderHistory); // Debug log

    function displayOrders(orders) {
        if (orders.length === 0) {
            reportList.innerHTML = `<p>No orders found.</p>`;
            console.log("No orders to display.");
            return;
        }
        reportList.innerHTML = orders
            .map(order => `
                <div class="report-item">
                    <p><strong>Bill Number:</strong> ${order.billNumber || 'N/A'}</p>
                    <p><strong>Table:</strong> ${order.table}</p>
                    <p><strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
                    <p><strong>Items:</strong> ${order.items.map(item => `${item.name} (${item.code}) x${item.qty} - $${(item.price * item.qty).toFixed(2)}`).join(", ")}</p>
                    <p><strong>Total:</strong> $${order.total}</p>
                    <hr>
                </div>`)
            .join("");
        console.log("Orders displayed:", orders);
    }

    function displayDailyReports(reports) {
        if (reports.length === 0) {
            reportList.innerHTML = `<p>No daily reports found.</p>`;
            console.log("No daily reports to display.");
            return;
        }
        reportList.innerHTML = reports
            .map(report => `
                <div class="report-item">
                    <p><strong>Date:</strong> ${new Date(report.date).toLocaleDateString()}</p>
                    <p><strong>Total Sales:</strong> $${report.totalSales}</p>
                    <p><strong>Items Sold:</strong> ${Object.entries(report.itemsSold)
                        .map(([item, qty]) => `${item} x${qty}`).join(", ")}</p>
                    <hr>
                </div>`)
            .join("");
        console.log("Daily reports displayed:", reports);
    }

    // Initial display: show all orders
    displayOrders(orderHistory);

    applyFilterBtn.addEventListener("click", () => {
        const type = filterType.value;
        const value = filterValue.value;
        let filteredOrders = [...orderHistory];
        let filteredDailyReports = [...dailyReports];

        if (type === "day" && value) {
            filteredOrders = filteredOrders.filter(order => new Date(order.date).toLocaleDateString() === new Date(value).toLocaleDateString());
            displayOrders(filteredOrders);
        } else if (type === "month" && value) {
            const [year, month] = value.split('-');
            filteredOrders = filteredOrders.filter(order => {
                const d = new Date(order.date);
                return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
            });
            displayOrders(filteredOrders);
        } else if (type === "range" && value) {
            const [start, end] = value.split(' to ');
            filteredOrders = filteredOrders.filter(order => {
                const d = new Date(order.date);
                const startDate = new Date(start);
                const endDate = new Date(end);
                return d >= startDate && d <= endDate;
            });
            displayOrders(filteredOrders);
        } else if (type === "daily") {
            displayDailyReports(filteredDailyReports);
        } else {
            displayOrders(orderHistory); // If no filter applied, show all orders
        }
    });

    searchBillBtn.addEventListener("click", () => {
        const billNumber = searchBillInput.value.trim();
        if (billNumber) {
            const filteredOrders = orderHistory.filter(order => order.billNumber === billNumber);
            if (filteredOrders.length > 0) {
                displayOrders(filteredOrders);
            } else {
                reportList.innerHTML = `<p>No orders found for bill number: ${billNumber}</p>`;
            }
        } else {
            displayOrders(orderHistory);
        }
    });
}

// Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => {
        console.log("Service Worker registered");
    });
}