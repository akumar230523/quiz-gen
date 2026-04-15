/**
 * Layout.jsx  ─  Page shell
 * Wraps all authenticated pages with Navbar + optional Footer.
 * The main content sits in a <main> element below the fixed navbar.
*/

import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, noFooter = false }) {
    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
            <Navbar />
            {/* pt-16 offsets the fixed navbar height */}
            <main className="flex-1 pt-16">
                {children}
            </main>
            {!noFooter && <Footer />}
        </div>
    );
}
