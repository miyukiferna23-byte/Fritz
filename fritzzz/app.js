// Student Attendance Monitoring System
// Data Storage
let students = JSON.parse(localStorage.getItem('students')) || [];
let attendance = JSON.parse(localStorage.getItem('attendance')) || [];
let scanning = false;
let videoStream = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    loadStudents();
    loadAttendance();
    // Set default date to today
    document.getElementById('attendanceDate').valueAsDate = new Date();
});

// Tab Navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Activate the corresponding tab button
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('onclick') === `showTab('${tabName}')`) {
            btn.classList.add('active');
        }
    });
    
    // Clear global search highlights when switching to non-search tabs
    if (tabName !== 'searchResults') {
        const globalSearchTerm = document.getElementById('globalSearch').value.trim();
        if (globalSearchTerm) {
            // Remove highlights but keep search term for when user returns
            removeHighlights();
        }
    }
    
    // Load tab content
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'students') {
        loadStudents();
    } else if (tabName === 'attendance') {
        loadAttendance();
    } else if (tabName === 'reports') {
        generateReport();
    } else if (tabName === 'searchResults') {
        // Search results tab is managed by performGlobalSearch
        // Don't reload if search term is empty
        const searchTerm = document.getElementById('globalSearch').value.trim();
        if (!searchTerm) {
            performGlobalSearch();
        }
    }
}

// Dashboard Functions
function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today);
    const presentCount = todayAttendance.filter(a => a.status === 'present').length;
    const absentCount = students.length - presentCount;
    const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;
    
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('presentToday').textContent = presentCount;
    document.getElementById('absentToday').textContent = absentCount;
    document.getElementById('attendanceRate').textContent = attendanceRate + '%';
    
    // Recent attendance
    const recentAttendance = attendance.slice(-10).reverse();
    const recentList = document.getElementById('recentAttendanceList');
    recentList.innerHTML = '';
    
    if (recentAttendance.length === 0) {
        recentList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No attendance records yet</p>';
    } else {
        recentAttendance.forEach(record => {
            const item = document.createElement('div');
            item.className = `attendance-item ${record.status}`;
            item.innerHTML = `
                <div>
                    <strong>${getStudentName(record.studentId)}</strong>
                    <p style="color: #6c757d; font-size: 0.9rem; margin-top: 5px;">
                        ${formatDate(record.date)} at ${record.time}
                    </p>
                </div>
                <span class="badge badge-${record.status}">${record.status.toUpperCase()}</span>
            `;
            recentList.appendChild(item);
        });
    }
}

// Student Management
function loadStudents() {
    const studentsList = document.getElementById('studentsList');
    studentsList.innerHTML = '';
    
    if (students.length === 0) {
        studentsList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px; grid-column: 1 / -1;">No students added yet. Click "Add Student" to get started.</p>';
        return;
    }
    
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
            <h3>${student.name}</h3>
            <div class="student-info">
                <p><strong>ID:</strong> ${student.id}</p>
                <p><strong>Class:</strong> ${student.class}</p>
                ${student.email ? `<p><strong>Email:</strong> ${student.email}</p>` : ''}
            </div>
            <div class="student-actions">
                <button class="btn btn-info btn-small" onclick="showQRCode('${student.id}')">📱 Show QR Code</button>
                <button class="btn btn-danger btn-small" onclick="deleteStudent('${student.id}')">🗑️ Delete</button>
            </div>
        `;
        studentsList.appendChild(card);
    });
}

function filterStudents() {
    const searchTerm = document.getElementById('searchStudents').value.toLowerCase();
    const cards = document.querySelectorAll('.student-card');
    
    // Remove existing highlights first
    removeHighlights();
    
    if (!searchTerm) {
        cards.forEach(card => card.style.display = 'block');
        return;
    }
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const matches = text.includes(searchTerm);
        card.style.display = matches ? 'block' : 'none';
        
        // Highlight matching text
        if (matches && searchTerm.length > 0) {
            highlightText(card, searchTerm);
        }
    });
}

function highlightText(element, searchTerm) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim()) {
            textNodes.push(node);
        }
    }
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
        if (regex.test(text)) {
            const highlighted = text.replace(regex, '<mark>$1</mark>');
            const wrapper = document.createElement('span');
            wrapper.innerHTML = highlighted;
            textNode.parentNode.replaceChild(wrapper, textNode);
        }
    });
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'block';
    document.getElementById('addStudentForm').reset();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function addStudent(event) {
    event.preventDefault();
    
    const name = document.getElementById('studentName').value.trim();
    const id = document.getElementById('studentId').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const studentClass = document.getElementById('studentClass').value.trim();
    
    // Check if student ID already exists
    if (students.some(s => s.id === id)) {
        alert('Student ID already exists!');
        return;
    }
    
    const student = {
        id: id,
        name: name,
        email: email,
        class: studentClass,
        createdAt: new Date().toISOString()
    };
    
    students.push(student);
    localStorage.setItem('students', JSON.stringify(students));
    
    closeModal('addStudentModal');
    loadStudents();
    loadDashboard();
    
    alert('Student added successfully!');
}

function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        students = students.filter(s => s.id !== studentId);
        attendance = attendance.filter(a => a.studentId !== studentId);
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('attendance', JSON.stringify(attendance));
        loadStudents();
        loadDashboard();
        loadAttendance();
    }
}

function showQRCode(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const qrData = JSON.stringify({
        studentId: student.id,
        name: student.name,
        class: student.class
    });
    
    const qrDisplay = document.getElementById('qrCodeDisplay');
    qrDisplay.innerHTML = '<p style="color: #6c757d;">Generating QR code...</p>';
    
    // Use toDataURL method which is more reliable
    QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error, url) {
        if (error) {
            console.error(error);
            qrDisplay.innerHTML = '<p style="color: #dc3545;">Error generating QR code. Please try again.</p>';
            return;
        }
        
        // Display the QR code image
        qrDisplay.innerHTML = `<img src="${url}" alt="QR Code" style="max-width: 100%; height: auto; border: 2px solid #e9ecef; border-radius: 10px; padding: 10px; background: white;">`;
    });
    
    document.getElementById('qrModal').style.display = 'block';
}

function printQRCode() {
    window.print();
}

// QR Code Scanning
function showScanModal() {
    document.getElementById('scanModal').style.display = 'block';
    startScanning();
}

function closeScanModal() {
    document.getElementById('scanModal').style.display = 'none';
    stopScanning();
}

function startScanning() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const resultDiv = document.getElementById('scanResult');
    
    scanning = true;
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment' // Use back camera if available
        } 
    })
    .then(stream => {
        videoStream = stream;
        video.srcObject = stream;
        video.play();
        
        function scan() {
            if (!scanning) return;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                try {
                    const data = JSON.parse(code.data);
                    if (data.studentId) {
                        markAttendance(data.studentId, 'present');
                        resultDiv.innerHTML = `
                            <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px;">
                                <strong>✓ Attendance Marked!</strong><br>
                                Student: ${data.name}<br>
                                ID: ${data.studentId}
                            </div>
                        `;
                        // Stop scanning after successful scan
                        setTimeout(() => {
                            closeScanModal();
                        }, 2000);
                    }
                } catch (e) {
                    resultDiv.innerHTML = `
                        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px;">
                            Invalid QR Code format
                        </div>
                    `;
                }
            } else {
                resultDiv.innerHTML = '<p style="color: #6c757d;">Point camera at QR code...</p>';
            }
            
            requestAnimationFrame(scan);
        }
        
        scan();
    })
    .catch(err => {
        console.error('Error accessing camera:', err);
        resultDiv.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px;">
                Error accessing camera. Please allow camera permissions and try again.
            </div>
        `;
    });
}

function stopScanning() {
    scanning = false;
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    const video = document.getElementById('video');
    video.srcObject = null;
    document.getElementById('scanResult').innerHTML = '';
}

// Attendance Management
function markAttendance(studentId, status) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    
    // Check if already marked today
    const existingIndex = attendance.findIndex(
        a => a.studentId === studentId && a.date === date
    );
    
    const record = {
        studentId: studentId,
        date: date,
        time: time,
        status: status,
        timestamp: now.toISOString()
    };
    
    if (existingIndex >= 0) {
        attendance[existingIndex] = record;
    } else {
        attendance.push(record);
    }
    
    localStorage.setItem('attendance', JSON.stringify(attendance));
    loadDashboard();
    loadAttendance();
}

function loadAttendance() {
    const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
    const dateAttendance = attendance.filter(a => a.date === date);
    
    const attendanceList = document.getElementById('attendanceList');
    
    if (dateAttendance.length === 0) {
        attendanceList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">No attendance records for this date.</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>Class</th>
                    <th>Time</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    dateAttendance.forEach(record => {
        const student = students.find(s => s.id === record.studentId);
        if (student) {
            html += `
                <tr>
                    <td>${student.name}</td>
                    <td>${student.id}</td>
                    <td>${student.class}</td>
                    <td>${record.time}</td>
                    <td><span class="badge badge-${record.status}">${record.status.toUpperCase()}</span></td>
                </tr>
            `;
        }
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    attendanceList.innerHTML = html;
}

function loadAttendanceByDate() {
    loadAttendance();
}

function exportAttendance() {
    const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
    const dateAttendance = attendance.filter(a => a.date === date);
    
    if (dateAttendance.length === 0) {
        alert('No attendance records for this date.');
        return;
    }
    
    let csv = 'Student Name,Student ID,Class,Time,Status\n';
    
    dateAttendance.forEach(record => {
        const student = students.find(s => s.id === record.studentId);
        if (student) {
            csv += `"${student.name}","${student.id}","${student.class}","${record.time}","${record.status}"\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Reports
function generateReport() {
    const period = document.getElementById('reportPeriod').value;
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'today':
            startDate = now.toISOString().split('T')[0];
            endDate = startDate;
            break;
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            startDate = weekStart.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
        case 'all':
            startDate = '2000-01-01';
            endDate = '2099-12-31';
            break;
    }
    
    const periodAttendance = attendance.filter(a => a.date >= startDate && a.date <= endDate);
    const presentCount = periodAttendance.filter(a => a.status === 'present').length;
    const totalRecords = periodAttendance.length;
    const uniqueStudents = new Set(periodAttendance.map(a => a.studentId)).size;
    const attendanceRate = students.length > 0 ? Math.round((presentCount / (students.length * Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))) * 100) : 0;
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
        <div class="report-stats">
            <div class="report-item">
                <h4>Total Records</h4>
                <p>${totalRecords}</p>
            </div>
            <div class="report-item">
                <h4>Present</h4>
                <p style="color: #28a745;">${presentCount}</p>
            </div>
            <div class="report-item">
                <h4>Students Tracked</h4>
                <p>${uniqueStudents}</p>
            </div>
            <div class="report-item">
                <h4>Period</h4>
                <p style="font-size: 1rem;">${formatDate(startDate)} to ${formatDate(endDate)}</p>
            </div>
        </div>
        <div style="margin-top: 30px;">
            <h3 style="margin-bottom: 20px;">Student Attendance Summary</h3>
            <table>
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Student ID</th>
                        <th>Class</th>
                        <th>Present Days</th>
                        <th>Total Days</th>
                        <th>Attendance Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(student => {
                        const studentRecords = periodAttendance.filter(a => a.studentId === student.id);
                        const presentDays = studentRecords.filter(a => a.status === 'present').length;
                        const totalDays = studentRecords.length;
                        const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
                        return `
                            <tr>
                                <td>${student.name}</td>
                                <td>${student.id}</td>
                                <td>${student.class}</td>
                                <td>${presentDays}</td>
                                <td>${totalDays}</td>
                                <td>${rate}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function exportReport() {
    const period = document.getElementById('reportPeriod').value;
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'today':
            startDate = now.toISOString().split('T')[0];
            endDate = startDate;
            break;
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            startDate = weekStart.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
        case 'all':
            startDate = '2000-01-01';
            endDate = '2099-12-31';
            break;
    }
    
    const periodAttendance = attendance.filter(a => a.date >= startDate && a.date <= endDate);
    
    let csv = 'Student Name,Student ID,Class,Date,Time,Status\n';
    
    periodAttendance.forEach(record => {
        const student = students.find(s => s.id === record.studentId);
        if (student) {
            csv += `"${student.name}","${student.id}","${student.class}","${record.date}","${record.time}","${record.status}"\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${period}_${startDate}_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Helper Functions
function getStudentName(studentId) {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Global Search Functionality
function performGlobalSearch() {
    const searchTerm = document.getElementById('globalSearch').value.trim().toLowerCase();
    const searchResultsTab = document.getElementById('searchResultsTab');
    const searchResultsContent = document.getElementById('searchResultsContent');
    
    if (!searchTerm) {
        searchResultsTab.style.display = 'none';
        if (document.getElementById('searchResults').classList.contains('active')) {
            showTab('dashboard');
        }
        // Remove highlights from current tab
        removeHighlights();
        return;
    }
    
    // Show search results tab
    searchResultsTab.style.display = 'block';
    
    // Perform search across all data
    const results = {
        students: [],
        attendance: [],
        reports: []
    };
    
    // Search students
    students.forEach(student => {
        const searchableText = `${student.name} ${student.id} ${student.email || ''} ${student.class}`.toLowerCase();
        if (searchableText.includes(searchTerm)) {
            results.students.push(student);
        }
    });
    
    // Search attendance records
    attendance.forEach(record => {
        const student = students.find(s => s.id === record.studentId);
        if (student) {
            const searchableText = `${student.name} ${student.id} ${student.class} ${record.date} ${record.time} ${record.status}`.toLowerCase();
            if (searchableText.includes(searchTerm)) {
                results.attendance.push({ record, student });
            }
        }
    });
    
    // Display results
    displaySearchResults(results, searchTerm);
    
    // Switch to search results tab if not already there
    if (!document.getElementById('searchResults').classList.contains('active')) {
        showTab('searchResults');
    }
    
    // Highlight search term in current tab if applicable
    highlightCurrentTab(searchTerm);
}

function displaySearchResults(results, searchTerm) {
    const searchResultsContent = document.getElementById('searchResultsContent');
    const totalResults = results.students.length + results.attendance.length;
    
    if (totalResults === 0) {
        searchResultsContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #6c757d; font-size: 1.1rem; margin-bottom: 10px;">No results found for "<strong>${escapeHtml(searchTerm)}</strong>"</p>
                <p style="color: #6c757d;">Try searching by student name, ID, class, email, date, or status.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="search-summary">
            <p>Found <strong>${totalResults}</strong> result${totalResults !== 1 ? 's' : ''} for "<strong>${escapeHtml(searchTerm)}</strong>"</p>
        </div>
    `;
    
    // Display Students Results
    if (results.students.length > 0) {
        html += `
            <div class="search-section">
                <h3>📚 Students (${results.students.length})</h3>
                <div class="students-grid">
        `;
        
        results.students.forEach(student => {
            const highlightedName = highlightMatch(student.name, searchTerm);
            const highlightedId = highlightMatch(student.id, searchTerm);
            const highlightedClass = highlightMatch(student.class, searchTerm);
            
            html += `
                <div class="student-card search-result-card">
                    <h3>${highlightedName}</h3>
                    <div class="student-info">
                        <p><strong>ID:</strong> ${highlightedId}</p>
                        <p><strong>Class:</strong> ${highlightedClass}</p>
                        ${student.email ? `<p><strong>Email:</strong> ${highlightMatch(student.email, searchTerm)}</p>` : ''}
                    </div>
                    <div class="student-actions">
                        <button class="btn btn-info btn-small" onclick="showQRCode('${student.id}')">📱 Show QR Code</button>
                        <button class="btn btn-danger btn-small" onclick="deleteStudent('${student.id}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Display Attendance Results
    if (results.attendance.length > 0) {
        html += `
            <div class="search-section">
                <h3>📋 Attendance Records (${results.attendance.length})</h3>
                <div class="attendance-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Student ID</th>
                                <th>Class</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        results.attendance.forEach(({ record, student }) => {
            html += `
                <tr>
                    <td>${highlightMatch(student.name, searchTerm)}</td>
                    <td>${highlightMatch(student.id, searchTerm)}</td>
                    <td>${highlightMatch(student.class, searchTerm)}</td>
                    <td>${highlightMatch(formatDate(record.date), searchTerm)}</td>
                    <td>${highlightMatch(record.time, searchTerm)}</td>
                    <td><span class="badge badge-${record.status}">${record.status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    searchResultsContent.innerHTML = html;
}

function highlightMatch(text, searchTerm) {
    if (!searchTerm) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightCurrentTab(searchTerm) {
    if (!searchTerm) return;
    
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    
    // Remove existing highlights
    removeHighlights();
    
    // Add highlights to visible content
    const walker = document.createTreeWalker(
        activeTab,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim() && node.parentElement.tagName !== 'SCRIPT' && node.parentElement.tagName !== 'STYLE') {
            textNodes.push(node);
        }
    }
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
        if (regex.test(text)) {
            const highlighted = text.replace(regex, '<mark>$1</mark>');
            const wrapper = document.createElement('span');
            wrapper.innerHTML = highlighted;
            textNode.parentNode.replaceChild(wrapper, textNode);
        }
    });
}

function removeHighlights() {
    const marks = document.querySelectorAll('mark');
    marks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    });
}

function showSearchSuggestions() {
    const searchTerm = document.getElementById('globalSearch').value.trim().toLowerCase();
    const suggestionsDiv = document.getElementById('searchSuggestions');
    
    if (!searchTerm || searchTerm.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    // Get quick suggestions from student names
    const suggestions = students
        .filter(s => s.name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm))
        .slice(0, 5)
        .map(s => ({ text: s.name, id: s.id }));
    
    if (suggestions.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    suggestionsDiv.innerHTML = '';
    suggestions.forEach(s => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = highlightMatch(s.text, searchTerm);
        item.addEventListener('click', () => {
            document.getElementById('globalSearch').value = s.text;
            document.getElementById('searchSuggestions').style.display = 'none';
            performGlobalSearch();
        });
        suggestionsDiv.appendChild(item);
    });
    suggestionsDiv.style.display = 'block';
}

function selectSuggestion(text) {
    document.getElementById('globalSearch').value = text;
    document.getElementById('searchSuggestions').style.display = 'none';
    performGlobalSearch();
}

function clearGlobalSearch() {
    document.getElementById('globalSearch').value = '';
    document.getElementById('searchSuggestions').style.display = 'none';
    document.getElementById('searchResultsTab').style.display = 'none';
    removeHighlights();
    showTab('dashboard');
}

// Close search suggestions when clicking outside
document.addEventListener('click', function(event) {
    const searchContainer = document.querySelector('.global-search-container');
    if (searchContainer && !searchContainer.contains(event.target)) {
        document.getElementById('searchSuggestions').style.display = 'none';
    }
});

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            if (modal.id === 'scanModal') {
                stopScanning();
            }
        }
    });
}

