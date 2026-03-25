// FILE: frontend/src/components/common/Layout.jsx

import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, noFooter = false }) {
    return (
        <div className="min-h-screen bg-ink flex flex-col">
            <Navbar />
            <main className="flex-1 pt-16">
                {children}
            </main>
            {!noFooter && <Footer />}
        </div>
    );
}