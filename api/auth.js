module.exports = async (req, res) => {
    // Get the requested URL
    const { url } = req.query;

    // Check if the user is authenticated (simulated by checking localStorage via a header)
    const isAuthenticated = req.headers['x-authenticated'] === 'true';

    if (!isAuthenticated) {
        res.writeHead(302, { Location: '/login.html' });
        res.end();
        return;
    }

    // If authenticated, serve the requested static page
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
                window.location.replace('/${url}');
            </script>
        </body>
        </html>
    `);
};