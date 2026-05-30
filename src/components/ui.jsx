export function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

export function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

export function Button({ className = "", children, ...props }) {
  return (
    <button type="button" className={`app-btn ${className}`} {...props}>
      {children}
    </button>
  );
}
