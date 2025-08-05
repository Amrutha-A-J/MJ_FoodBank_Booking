type NavbarProps = {
    role: string;
    name?: string;
    onPageChange: (page: string) => void;
    onLogout: () => void;
  };
  
  export default function Navbar({ role, name, onPageChange, onLogout }: NavbarProps) {
  const isStaff = role === 'staff' || role === 'volunteer_coordinator';
    return (
      <nav
        style={{
          display: 'flex',
          gap: 12,
          padding: '8px 16px',
          backgroundColor: '#004aad',
          color: 'white',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          borderRadius: 8,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 20, cursor: 'default' }}>Food Bank Portal</div>
  
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {role === 'shopper' && (
            <>
              <button onClick={() => onPageChange('home')} style={buttonStyle}>
                Book Slot
              </button>
              <button onClick={() => onPageChange('profile')} style={buttonStyle}>
                My Bookings
              </button>
            </>
          )}
  
          {isStaff && (
            <>
              <button onClick={() => onPageChange('home')} style={buttonStyle}>
                Pending
              </button>
              <button onClick={() => onPageChange('manual')} style={buttonStyle}>
                Manual Booking
              </button>
              <button onClick={() => onPageChange('availability')} style={buttonStyle}>
                Availability
              </button>
              <button onClick={() => onPageChange('users')} style={buttonStyle}>
                Users
              </button>
              <button onClick={() => onPageChange('profile')} style={buttonStyle}>
                Search Profile
              </button>
            </>
          )}
  
          {/* Add delivery role nav here */}
        </div>
  
        <div>
          <span style={{ marginRight: 12 }}>Hello, {name}</span>
          <button onClick={onLogout} style={{ ...buttonStyle, backgroundColor: '#c62828' }}>
            Logout
          </button>
        </div>
      </nav>
    );
  }
  
  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    border: '1px solid white',
    borderRadius: 4,
    color: 'white',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 14,
  };
  