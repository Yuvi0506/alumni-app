// Load header
fetch('/header.html')
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
                document.getElementById('loggedInUser').textContent = `Welcome, ${storedName}`;
                document.getElementById('logoutButton').classList.remove('hidden');
                document.getElementById('profileLink').classList.remove('hidden');
            }
        }
    })
    .catch(err => console.error('Error loading header:', err));

// Load footer
fetch('/footer.html')
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
    // Redirect to index.html and ensure login section is shown
    window.location.href = '/index.html';
}
