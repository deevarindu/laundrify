import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b">
      <div>
        <Link
          to="/"  
        >
          Laundrify.
        </Link>

        <nav>
          <Link
            to="/services"
          >
            Services
          </Link>
          <Link
            to="/track"
          >
            Track
          </Link>
        </nav>
      </div>
    </header>
  )
}