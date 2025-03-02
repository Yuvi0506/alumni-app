// Load header
fetch('/header.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('header-placeholder').innerHTML = data;

        // Update logged-in user info after header is loaded
        let storedEmail = localStorage.getItem('userEmail');
        const storedName = localStorage.getItem('userName');

        // Convert stored email to lowercase
        if (storedEmail) storedEmail = storedEmail.toLowerCase();

        if (storedEmail && storedName) {
            document.getElementById('loggedInUser').textContent = `Welcome, ${storedName}`;
            document.getElementById('logoutButton').classList.remove('hidden');
            document.getElementById('profileLink').classList.remove('hidden');
        }
    })
    .catch(err => console.error('Error loading header:', err));

// Load footer
fetch('/footer.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('footer-placeholder').innerHTML = data;
    })
    .catch(err => console.error('Error loading footer:', err));

// Common logout function
function logout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    window.location.href = '/index.html';
}
