// Initialize Dexie Database
const db = new Dexie("RestaurantDB");
db.version(1).stores({
    users: "++id, username, loginTime", // Auto-incremented ID
    tables: "name, type",
    menu: "code, name, price",
    orders: "++id, billNumber, table, total, timestamp, date, [table+date]", // Compound index for table+date
    dailyReports: "++id, date, totalSales, timestamp"
});

let currentTable = null;
let directoryHandle = null;

document.addEventListener("DOMContentLoaded", async () => {
    const path = window.location.pathname;
    const user = await db.users.get({ username: "admin" });

    if (!path.includes("index.html") && !user) {
        window.location.href = "index.html";
    } else if (user) {
        const timeElapsed = Date.now() - user.loginTime;
        const twelveHours = 12 * 60 * 60 * 1000;
        if (timeElapsed >= twelveHours) {
            await db.users.delete(user.id);
            window.location.href = "index.html";
        } else {
            if (document.getElementById("user")) document.getElementById("user").textContent = user.username;
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
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            if (username === "admin" && password === "password123") {
                await db.users.put({ username: username, loginTime: Date.now() });
                window.location.href = "dashboard.html";
            } else {
                document.getElementById("error").textContent = "Invalid credentials!";
            }
        });
    }
});

const logoutBtns = document.querySelectorAll("#logoutBtn");
logoutBtns.forEach(btn => btn.addEventListener("click", async () => {
    const user = await db.users.get({ username: "admin" });
    if (user) await db.users.delete(user.id);
    window.location.href = "index.html";
}));

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

function setupSidebarToggle() {
    const toggleBtn = document.getElementById("toggleSidebar");
    const sidebar = document.getElementById("sidebar");
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("hidden");
        });
    }
}

async function loadTables() {
    const tableGrid = document.getElementById("tableGrid");
    const tableList = document.getElementById("tableList");
    tables = await db.tables.toArray();

    if (tableGrid) {
        if (tables.length === 0) {
            tableGrid.innerHTML = `<p>No tables available. Set up tables in tables.html</p>`;
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
    return db.orders.where("table").equals(tableName).count((count) => count > 0 ? "occupied" : "free");
}

async function selectTable(tableName) {
    currentTable = tableName;
    const table = await db.tables.get({ name: tableName });
    const currentTableInfo = document.getElementById("currentTableInfo");
    const itemInput = document.getElementById("itemInput");

    if (currentTableInfo) {
        currentTableInfo.innerHTML = table ? `
            <p><strong>Table:</strong> ${table.name} (${table.type})</p>
            <p><strong>Status:</strong> ${await getTableStatus(table.name) === "occupied" ? "Occupied" : "Free"}</p>
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
    }
}

async function setupTableManagement() {
    const generateTablesBtn = document.getElementById("generateTables");
    const tableCount = document.getElementById("tableCount");

    if (generateTablesBtn) {
        generateTablesBtn.addEventListener("click", async () => {
            const count = parseInt(tableCount.value) || 0;
            if (count > 0) {
                await db.tables.clear();
                for (let i = 1; i <= count; i++) {
                    await db.tables.put({ name: `Table ${i}`, type: "Regular" });
                }
                tables = await db.tables.toArray();
                loadTables();
                tableCount.value = "";
            } else {
                alert("Please enter a valid number of tables!");
            }
        });
    }
}

async function editTable(index) {
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

async function saveTableEdit(index) {
    const newName = document.getElementById("editTableName").value;
    const newType = document.getElementById("editTableType").value;
    await db.tables.update(tables[index], { name: newName, type: newType });
    tables = await db.tables.toArray();
    loadTables();
}

async function deleteTable(index) {
    if (confirm("Are you sure you want to delete this table?")) {
        await db.tables.delete(tables[index].name);
        tables = await db.tables.toArray();
        loadTables();
    }
}

async function loadMenu() {
    const menuList = document.getElementById("menuList");
    menu = await db.menu.toArray();
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

async function setupMenuForm() {
    const menuForm = document.getElementById("menuForm");
    if (menuForm) {
        menuForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const item = {
                code: document.getElementById("itemCode").value,
                name: document.getElementById("itemNameMenu").value,
                price: parseFloat(document.getElementById("itemPriceMenu").value)
            };
            await db.menu.put(item);
            menu = await db.menu.toArray();
            loadMenu();
            menuForm.reset();
        });
    }
}

async function editMenuItem(index) {
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

async function saveMenuEdit(index) {
    const newCode = document.getElementById("editItemCode").value;
    const newName = document.getElementById("editItemName").value;
    const newPrice = parseFloat(document.getElementById("editItemPrice").value);
    await db.menu.update(menu[index].code, { code: newCode, name: newName, price: newPrice });
    menu = await db.menu.toArray();
    loadMenu();
}

async function setupInputs() {
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
            const sidebar = document.getElementById("sidebar");
            if (sidebar) {
                sidebar.classList.add("hidden");
            }
        }
    }

    itemQty.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && currentTable) {
            const qty = parseInt(itemQty.value) || 1;
            const selectedItemInfo = currentTableInfo.innerHTML.match(/Selected Item: ([\w\s]+) \((\w+)\) - \$([\d.]+)/);
            if (selectedItemInfo) {
                const name = selectedItemInfo[1];
                const code = selectedItemInfo[2];
                const price = parseFloat(selectedItemInfo[3]);
                const item = { name, code, price, qty };
                let currentOrder = await db.orders.where({ table: currentTable, date: new Date().toISOString().split('T')[0] }).toArray();
                currentOrder.push(item);
                await db.orders.bulkPut(currentOrder.map((item, idx) => ({ ...item, id: idx + 1, table: currentTable, date: new Date().toISOString().split('T')[0] })));
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

async function loadOrder(tableName) {
    currentTable = tableName;
    const currentOrder = await db.orders.where({ table: tableName, date: new Date().toISOString().split('T')[0] }).toArray();
    const orderList = document.getElementById("orderList");
    const currentTableInfo = document.getElementById("currentTableInfo");
    const table = await db.tables.get({ name: tableName });

    if (currentTableInfo) {
        currentTableInfo.innerHTML = table ? `
            <p><strong>Table:</strong> ${table.name} (${table.type})</p>
            <p><strong>Status:</strong> ${await getTableStatus(table.name) === "occupied" ? "Occupied" : "Free"}</p>
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

async function saveOrder() {
    if (currentTable) {
        const currentOrder = await db.orders.where({ table: currentTable, date: new Date().toISOString().split('T')[0] }).toArray();
        if (currentOrder.length > 0) {
            await db.orders.bulkPut(currentOrder);
        }
    }
}

function generateBillNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `BILL-${timestamp}-${random}`;
}

async function printReceipt() {
    if (!currentTable) {
        alert("No table selected!");
        return;
    }
    const currentOrder = await db.orders.where({ table: currentTable, date: new Date().toISOString().split('T')[0] }).toArray();
    if (currentOrder.length === 0) {
        alert("No order to generate receipt for!");
        return;
    }

    const total = currentOrder.reduce((sum, item) => sum + item.price * item.qty, 0);
    const billNumber = generateBillNumber();
    const timestamp = new Date().toISOString();
    const restaurantName = "Sample Restaurant";
    const dateFolder = new Date().toISOString().split('T')[0];

    const orderDetails = {
        billNumber: billNumber,
        table: currentTable,
        items: [...currentOrder.map(item => ({ name: item.name, code: item.code, price: item.price, qty: item.qty }))],
        total: total.toFixed(2),
        timestamp: timestamp,
        date: dateFolder
    };

    await db.orders.add(orderDetails);
    await db.orders.where({ table: currentTable, date: dateFolder }).delete();

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

    if ('showDirectoryPicker' in window) {
        try {
            if (!directoryHandle) {
                directoryHandle = await window.showDirectoryPicker();
            }
            let dateDirHandle = await directoryHandle.getDirectoryHandle(dateFolder, { create: true });
            const fileHandle = await dateDirHandle.getFileHandle(billNumber + '.txt', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(receipt);
            await writable.close();
        } catch (err) {
            console.error("Error saving receipt to directory:", err);
            alert("Failed to save receipt to local folder. Falling back to download.");
            const blob = new Blob([receipt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${billNumber}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }
    } else {
        const blob = new Blob([receipt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${billNumber}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    loadOrder(currentTable);
    const currentTableInfo = document.getElementById("currentTableInfo");
    currentTableInfo.innerHTML = currentTable ? `
        <p><strong>Table:</strong> ${currentTable} (Regular)</p>
        <p><strong>Status:</strong> Free</p>
    ` : "";
}

async function closeDay() {
    const reports = await db.dailyReports.toArray();
    const today = new Date().toISOString().split('T')[0];
    let dailyTotal = 0;
    let itemSales = {};

    const orders = await db.orders.where("date").equals(today).toArray();
    orders.forEach(order => {
        dailyTotal += parseFloat(order.total);
        order.items.forEach(item => {
            const key = `${item.name} (${item.code})`;
            itemSales[key] = (itemSales[key] || 0) + item.qty;
        });
    });

    const report = {
        date: today,
        totalSales: dailyTotal.toFixed(2),
        itemsSold: itemSales,
        timestamp: new Date().toISOString()
    };
    await db.dailyReports.add(report);
    await db.orders.where("date").equals(today).delete();

    loadTables();
    alert(`Day closed for ${today}. Total Sales: $${dailyTotal.toFixed(2)}. Reports saved.`);
}

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

const selectRecordsFolderBtn = document.getElementById("selectRecordsFolder");
const folderStatus = document.getElementById("folderStatus");

if (selectRecordsFolderBtn && folderStatus) {
    selectRecordsFolderBtn.addEventListener("click", async () => {
        if ('showDirectoryPicker' in window) {
            try {
                directoryHandle = await window.showDirectoryPicker();
                folderStatus.textContent = `Selected folder: ${directoryHandle.name}`;
            } catch (err) {
                console.error("Error selecting directory:", err);
                folderStatus.textContent = "Failed to select folder.";
                alert("Please allow access to the folder.");
            }
        } else {
            folderStatus.textContent = "File System Access API not supported. Use download fallback.";
            alert("Your browser does not support saving to a folder. Receipts will be downloaded instead.");
        }
    });
}

async function loadReports() {
    const orderHistory = await db.orders.toArray();
    const dailyReports = await db.dailyReports.toArray();
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

    function displayOrders(orders) {
        if (orders.length === 0) {
            reportList.innerHTML = `<p>No orders found.</p>`;
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
    }

    function displayDailyReports(reports) {
        if (reports.length === 0) {
            reportList.innerHTML = `<p>No daily reports found.</p>`;
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
    }

    displayOrders(orderHistory);

    applyFilterBtn.addEventListener("click", async () => {
        const type = filterType.value;
        const value = filterValue.value;
        let filteredOrders = [...orderHistory];
        let filteredDailyReports = [...dailyReports];

        if (type === "day" && value) {
            filteredOrders = await db.orders.where("date").equals(value).toArray();
            displayOrders(filteredOrders);
        } else if (type === "month" && value) {
            const [year, month] = value.split('-');
            filteredOrders = await db.orders.where("date").startsWith(`${year}-${month}`).toArray();
            displayOrders(filteredOrders);
        } else if (type === "range" && value) {
            const [start, end] = value.split(' to ');
            filteredOrders = await db.orders.where("date").between(start, end).toArray();
            displayOrders(filteredOrders);
        } else if (type === "daily") {
            displayDailyReports(filteredDailyReports);
        } else {
            displayOrders(orderHistory);
        }
    });

    searchBillBtn.addEventListener("click", async () => {
        const billNumber = searchBillInput.value.trim();
        if (billNumber) {
            const filteredOrders = await db.orders.where("billNumber").equals(billNumber).toArray();
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

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => {
        console.log("Service Worker registered");
    });
}