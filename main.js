function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('-translate-x-full');
}

function openModal(type) {
    const modal = document.getElementById('authModal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    if (type === 'login') {
        content.innerHTML = `
            <h2 class="text-2xl font-black mb-2 uppercase italic text-yellow-400">Welcome Back</h2>
            <p class="text-zinc-500 text-xs mb-6 uppercase">Enter your credentials to access the gym</p>
            <form class="space-y-4" onsubmit="handleLogin(event)">
                <input type="text" id="loginName" placeholder="Full Name" class="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white focus:border-yellow-400 outline-none" required>
                <input type="password" id="loginPass" placeholder="Password" class="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white focus:border-yellow-400 outline-none" required>
                <button type="submit" class="w-full bg-yellow-400 text-black py-3 rounded-lg font-bold uppercase hover:bg-yellow-500 transition">Enter Gym</button>
            </form>
            <p class="text-zinc-600 text-[10px] mt-4 text-center italic">Tip: If login fails after code updates, type "RESET" as username to clear local data.</p>
        `;
    } else {
        content.innerHTML = `
            <h2 class="text-2xl font-black mb-2 uppercase italic text-yellow-400">Join NFG</h2>
            <p class="text-zinc-500 text-xs mb-6 uppercase">Create your local test account</p>
            <form class="space-y-4" onsubmit="handleSignup(event)">
                <input type="text" id="signupName" placeholder="Full Name" class="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white focus:border-yellow-400 outline-none" required>
                <input type="password" id="signupPass" placeholder="Create Password" class="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white focus:border-yellow-400 outline-none" required>
                <button type="submit" class="w-full bg-yellow-400 text-black py-3 rounded-lg font-bold uppercase hover:bg-yellow-500 transition">Start Training</button>
            </form>
        `;
    }
}

function closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginName').value.trim();
    const password = document.getElementById('loginPass').value;
    
    if (username === "RESET") {
        localStorage.removeItem('nfg_mock_users');
        localStorage.removeItem('nfg_user');
        alert("Local storage cleared! Please Sign Up again.");
        location.reload();
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            const user = await response.json();
            localStorage.setItem('nfg_user', JSON.stringify(user));
            showDashboard(user);
        } else { 
            alert("Invalid credentials."); 
        }
    } catch (e) { 
        // Fallback to local storage for testing
        const mockUsers = JSON.parse(localStorage.getItem('nfg_mock_users') || '[]');
        console.log("Attempting local login for:", username);
        
        const localUser = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        
        if (localUser) {
            const userSession = { 
                username: localUser.username, 
                role: localUser.role || (localUser.username.toLowerCase().includes('admin') ? 'ADMIN' : 'MEMBER')
            };
            localStorage.setItem('nfg_user', JSON.stringify(userSession));
            showDashboard(userSession);
        } else {
            console.log("Login failed. Current local users:", mockUsers);
            alert("Login Failed: Incorrect name or password. Make sure you Signed Up first!");
        }
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById('signupName').value.trim();
    const password = document.getElementById('signupPass').value;
    
    try {
        const response = await fetch('http://localhost:8080/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            alert("Account created!");
            openModal('login');
        }
    } catch (e) {
        let mockUsers = JSON.parse(localStorage.getItem('nfg_mock_users') || '[]');
        if (!mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            const newUser = { 
                id: Date.now(), // Unique ID for editing/deleting
                username: username, 
                password: password,
                role: username.toLowerCase().includes('admin') ? 'ADMIN' : 'MEMBER',
                passType: 'None',
                expiryDate: 'N/A',
                balance: 0,
                isFullyPaid: true
            };
            mockUsers.push(newUser); 
            localStorage.setItem('nfg_mock_users', JSON.stringify(mockUsers));
            alert("Success! Account '" + username + "' created in local memory. You can now Log In.");
            openModal('login');
        } else {
            alert("Username already exists.");
        }
    }
}

async function showDashboard(user) {
    closeModal();
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    const header = document.querySelector('header');
    if (header) header.classList.add('hidden');
    
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        let latestData = user;

        // 1. RE-FETCH logic: Ask the server for the current data
        try {
            const response = await fetch('http://localhost:8080/api/admin/users');
            if (response.ok) {
                const allUsers = await response.json();
                // Find 'you' in the list from the database
                const freshUser = allUsers.find(u => u.username.toLowerCase() === user.username.toLowerCase());
                if (freshUser) {
                    latestData = freshUser;
                    // Update LocalStorage so the 'snapshot' is now current
                    localStorage.setItem('nfg_user', JSON.stringify(latestData));
                }
            }
        } catch (e) {
            console.log("Using local mock data (Server Offline)");
            const allUsers = JSON.parse(localStorage.getItem('nfg_mock_users') || '[]');
            latestData = allUsers.find(u => u.username.toLowerCase() === user.username.toLowerCase()) || user;
        }

        // 2. FRONTEND UPDATE: Injecting the data into your original design
        dashboard.querySelector('h2').innerHTML = `<span class="text-yellow-400">Welcome,</span> ${latestData.username}`;
        
        const passInfoDiv = document.getElementById('passInfo');
        if (passInfoDiv && latestData.passType && latestData.passType !== 'None') {
            passInfoDiv.innerHTML = `
                <p class="text-yellow-400 text-xs font-bold uppercase italic mb-1">${latestData.passType} Pass</p>
                <p class="text-white font-black text-2xl">Expires: ${latestData.expiryDate}</p>
                <div class="mt-4 pt-4 border-t border-zinc-800">
                    <p class="text-xs uppercase tracking-widest text-zinc-500 mb-1">Payment Status</p>
                    <p class="${latestData.isFullyPaid ? 'text-green-400' : 'text-orange-400'} font-bold">
                        ${latestData.isFullyPaid ? '● FULLY PAID' : '● BALANCE: ₱' + latestData.balance}
                    </p>
                </div>
            `;
        }

        const adminPanel = document.getElementById('adminPanel');
        if (latestData.role === "ADMIN") {
            adminPanel.classList.remove('hidden');
        } else {
            adminPanel.classList.add('hidden');
        }
        
        dashboard.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('nfg_user');
    location.reload(); 
}

async function manageMembers() {
    try {
        const response = await fetch('http://localhost:8080/api/admin/users');
        let users = response.ok ? await response.json() : JSON.parse(localStorage.getItem('nfg_mock_users') || '[]');
        
        let tableHTML = `
            <div id="memberModal" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[500] p-4">
                <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-5xl shadow-2xl overflow-auto max-h-[90vh]">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-yellow-400 uppercase italic">Member Directory</h2>
                        <button onclick="document.getElementById('memberModal').remove()" class="text-zinc-500 hover:text-white text-2xl">&times;</button>
                    </div>
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr class="text-zinc-500 border-b border-zinc-800">
                                <th class="pb-3 px-2">Name</th>
                                <th class="pb-3 px-2">Pass</th>
                                <th class="pb-3 px-2">Expires</th>
                                <th class="pb-3 px-2">Status</th>
                                <th class="pb-3 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr class="border-b border-zinc-800/50 hover:bg-white/5">
                                    <td class="py-4 px-2 font-bold text-zinc-200">${u.username}</td>
                                    <td class="py-4 px-2 text-zinc-400">${u.passType || 'None'}</td>
                                    <td class="py-4 px-2 text-zinc-400">${u.expiryDate || 'None'}</td>
                                    <td class="py-4 px-2">
                                        ${u.isFullyPaid ? '<span class="text-green-400 font-bold uppercase text-[10px] bg-green-400/10 px-2 py-1 rounded">Paid</span>' : `<span class="text-orange-400 font-bold text-[10px] bg-orange-400/10 px-2 py-1 rounded">₱${u.balance || 0}</span>`}
                                    </td>
                                    <td class="py-4 px-2 text-right space-x-2">
                                        <button onclick="openEditForm(${u.id}, '${u.username}')" class="bg-zinc-800 hover:bg-yellow-400 hover:text-black px-3 py-1 rounded font-bold text-[10px]">EDIT</button>
                                        <button onclick="deleteMember(${u.id}, '${u.username}')" class="bg-red-900/30 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1 rounded font-bold text-[10px]">DEL</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', tableHTML);
    } catch (e) {
        alert("Error loading members.");
    }
}

function openEditForm(id, name) {
    // Find the current data to pre-fill the form
    const mockUsers = JSON.parse(localStorage.getItem('nfg_mock_users') || '[]');
    const user = mockUsers.find(u => u.id == id) || {};

    const editHTML = `
        <div id="editModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[600]">
            <div class="bg-zinc-800 p-8 rounded-2xl w-96 border border-yellow-400/30 shadow-2xl">
                <h3 class="text-yellow-400 font-bold mb-4 italic uppercase">Editing: ${name}</h3>
                <div class="space-y-4">
                    <select id="editPassType" class="w-full bg-zinc-900 p-2 rounded text-white border border-zinc-700">
                        <option value="None" ${user.passType === 'None' ? 'selected' : ''}>None</option>
                        <option value="Student" ${user.passType === 'Student' ? 'selected' : ''}>Student</option>
                        <option value="Regular" ${user.passType === 'Regular' ? 'selected' : ''}>Regular</option>
                    </select>
                    <input type="date" id="editExpiry" value="${user.expiryDate && user.expiryDate !== 'N/A' ? user.expiryDate : ''}" class="w-full bg-zinc-900 p-2 rounded text-white border border-zinc-700">
                    <input type="number" id="editBalance" placeholder="Balance Amount" value="${user.balance || 0}" class="w-full bg-zinc-900 p-2 rounded text-white border border-zinc-700">
                    <div class="flex items-center space-x-2 text-white text-sm">
                        <input type="checkbox" id="editPaid" ${user.isFullyPaid ? 'checked' : ''}> <label>Mark as Fully Paid</label>
                    </div>
                    <div class="flex space-x-2 mt-4">
                        <button onclick="saveUser(${id})" class="flex-1 bg-yellow-400 text-black py-2 rounded font-bold hover:bg-yellow-500">SAVE</button>
                        <button onclick="document.getElementById('editModal').remove()" class="flex-1 bg-zinc-700 text-white py-2 rounded font-bold hover:bg-zinc-600">CANCEL</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', editHTML);
}

async function saveUser(id) {
    const updatedData = {
        passType: document.getElementById('editPassType').value,
        expiryDate: document.getElementById('editExpiry').value || 'N/A',
        balance: parseFloat(document.getElementById('editBalance').value || 0),
        isFullyPaid: document.getElementById('editPaid').checked
    };

    try {
        const response = await fetch('http://localhost:8080/api/admin/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updatedData })
        });
        if (response.ok) alert("Updated successfully.");
    } catch (e) {
        let mockUsers = JSON.parse(localStorage.getItem('nfg_mock_users') || '[]');
        const index = mockUsers.findIndex(u => u.id == id);
        if (index !== -1) {
            mockUsers[index] = { ...mockUsers[index], ...updatedData };
            localStorage.setItem('nfg_mock_users', JSON.stringify(mockUsers));
            alert("Local update saved successfully!");
        }
    }
    document.getElementById('editModal').remove();
    if (document.getElementById('memberModal')) document.getElementById('memberModal').remove();
    manageMembers();
}

async function deleteMember(id, name) {
    if(!confirm("Are you sure you want to delete " + name + " from the directory?")) return;
    try {
        await fetch('http://localhost:8080/api/admin/delete-user/' + id, { method: 'DELETE' });
    } catch (e) {
        let mockUsers = JSON.parse(localStorage.getItem('nfg_mock_users') || '[]');
        mockUsers = mockUsers.filter(u => u.id != id);
        localStorage.setItem('nfg_mock_users', JSON.stringify(mockUsers));
        alert("Member '" + name + "' deleted from local memory.");
    }
    if (document.getElementById('memberModal')) document.getElementById('memberModal').remove();
    manageMembers();
}

async function addDayToAll() {
    console.log("1. Sending +1 request to Spring Boot...");
    
    try {
        const response = await fetch('http://localhost:8080/api/admin/add-day', { 
            method: 'POST' 
        });

        if (response.ok) {
            console.log("2. Server said OK. Waiting 100ms for Database to commit...");

            // We add a tiny delay to ensure MySQL is 100% finished updating 
            // before we try to fetch the new dates.
            setTimeout(async () => {
                try {
                    // 3. GET THE NEW DATA FROM THE DATABASE
                    const userRes = await fetch('http://localhost:8080/api/admin/users');
                    const allUsersFromDB = await userRes.json();
                    console.log("3. Fresh data received from DB:", allUsersFromDB);

                    // 4. OVERWRITE LOCAL STORAGE LIST
                    localStorage.setItem('nfg_mock_users', JSON.stringify(allUsersFromDB));

                    // 5. UPDATE CURRENT SESSION
                    const currentSession = JSON.parse(localStorage.getItem('nfg_user'));
                    if (currentSession) {
                        // Find the logged-in user in the new list (case-insensitive)
                        const updatedMe = allUsersFromDB.find(u => 
                            u.username.toLowerCase() === currentSession.username.toLowerCase()
                        );

                        if (updatedMe) {
                            console.log("4. Syncing local session with new date:", updatedMe.expiryDate);
                            localStorage.setItem('nfg_user', JSON.stringify(updatedMe));
                            
                            // 6. REFRESH THE UI
                            await showDashboard(updatedMe); 
                        }
                    }

                    // 7. REFRESH THE MEMBER DIRECTORY (if it's open)
                    if (document.getElementById('memberModal')) {
                        document.getElementById('memberModal').remove();
                        manageMembers();
                    }

                    alert("Success! Gym cycles extended by +1 day.");
                    
                } catch (innerError) {
                    console.error("Error during refresh sync:", innerError);
                }
            }, 100); 

        } else {
            const errorMsg = await response.text();
            alert("Server Error: " + errorMsg);
        }
    } catch (e) {
        console.error("CRITICAL CONNECTION ERROR:", e);
        alert("Could not reach Spring Boot. Is it running on port 8080?");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('savingsTable');
    if (table) {
        const data = [
            { days: 3, daily: 40, monthly: 480 },
            { days: 4, daily: 40, monthly: 640 },
            { days: 5, daily: 40, monthly: 800 },
            { days: 6, daily: 40, monthly: 960 }
        ];
        table.innerHTML = data.map(row => `
            <tr class="border-b border-zinc-900"><td class="py-3">${row.days} Days</td><td>₱${row.daily}</td><td class="font-bold text-white">₱${row.monthly}</td></tr>
        `).join('');
    }
    
    // Ensure admin buttons in dashboard are mapped
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        const buttons = adminPanel.querySelectorAll('button');
        if (buttons[0]) buttons[0].onclick = manageMembers;
        if (buttons[1]) buttons[1].onclick = addDayToAll;
    }

    const saved = localStorage.getItem('nfg_user');
    if (saved) showDashboard(JSON.parse(saved));
});