module.exports = async (req, res) => {
    // Simulate authentication check (in a real app, you'd use a secure session/token)
    const { url } = req;

    // Check if the user is authenticated (simulated by checking localStorage via a query param for demo purposes)
    // In a real app, you'd use a secure mechanism like JWT tokens or cookies
    const isAuthenticated = req.headers['x-authenticated'] === 'true'; // Simulated header

    if (!isAuthenticated) {
        // Redirect to login.html if not authenticated
        res.writeHead(302, { Location: '/login.html' });
        res.end();
        return;
    }

    // Serve the requested page if authenticated
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redirecting...</title>
        </head>
        <body>
            <script>
                // Redirect to the requested page
                window.location.href = '/${url}';
            </script>
        </body>
        </html>
    `);
};
