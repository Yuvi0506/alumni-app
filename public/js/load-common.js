// Define protected paths (require authentication)
const protectedPaths = [
    '/html/index.html',
    '/html/profile.html'
];

// Define paths that should be accessible without authentication
const publicPaths = [
    '/login.html',
    '/html/signup.html',
    '/html/verify-email.html',
    '/html/forgot-password.html',
    '/html/reset-password.html'
];

// Immediate authentication check
(function() {
    if (!publicPaths.includes(window.location.pathname)) {
        const storedRole = localStorage.getItem('userRole');
        const storedEmail = localStorage.getItem('userEmail');
        const storedName = localStorage.getItem('userName');
        if (!storedRole || !storedEmail || !storedName) {
            window.location.href = '/login.html'; // Redirect to login if not authenticated
            return;
        }
    }
})();

// Load header
fetch('/html/header.html')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load header');
        return response.text();
    })
    .then(data => {
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (headerPlaceholder) {
            headerPlaceholder.innerHTML = data;

            // Update logged-in user info after header is loaded
            let storedEmail = localStorage.getItem('userEmail');
            const storedName = localStorage.getItem('userName');

            // Convert stored email to lowercase
            if (storedEmail) storedEmail = storedEmail.toLowerCase();

            if (storedEmail && storedName) {
                const loggedInUser = document.getElementById('loggedInUser');
                const logoutButton = document.getElementById('logoutButton');
                const profileLink = document.getElementById('profileLink');
                if (loggedInUser) {
                    loggedInUser.textContent = `Welcome, ${storedName}`;
                }
                if (logoutButton) {
                    logoutButton.classList.remove('hidden');
                }
                if (profileLink) {
                    profileLink.classList.remove('hidden');
                }
            }
        }
    })
    .catch(err => console.error('Error loading header:', err));

// Load footer
fetch('/html/footer.html')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load footer');
        return response.text();
    })
    .then(data => {
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            footerPlaceholder.innerHTML = data;
        }
    })
    .catch(err => console.error('Error loading footer:', err));

// Common logout function
function logout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    // Redirect to login.html
    window.location.href = '/login.html';
}
