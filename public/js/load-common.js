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
    '/html/reset-password.html',
    '/html/home.html' // Ensures home page is accessible before login
];

// Prevent redirect loop by checking if already redirecting
let isRedirecting = false;

// Immediate authentication check with logging
(function() {
    if (isRedirecting) {
        console.log('Already redirecting, skipping authentication check.');
        return;
    }

    console.log('Current path:', window.location.pathname);

    // Skip authentication check for public paths
    if (publicPaths.includes(window.location.pathname)) {
        console.log('Public path, no redirect needed:', window.location.pathname);
        return;
    }

    // Check authentication
    console.log('Checking authentication...');
    const storedRole = localStorage.getItem('userRole');
    const storedEmail = localStorage.getItem('userEmail');
    const storedName = localStorage.getItem('userName');
    if (!storedRole || !storedEmail || !storedName) {
        console.log('User not authenticated, redirecting to /login.html');
        isRedirecting = true;
        window.location.replace('/login.html'); // Use replace to avoid history stack issues
        return;
    }
    console.log('User authenticated, proceeding to load page.');
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

            // Update logged-in user info
            let storedEmail = localStorage.getItem('userEmail');
            const storedName = localStorage.getItem('userName');

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
    window.location.replace('/login.html');
}
