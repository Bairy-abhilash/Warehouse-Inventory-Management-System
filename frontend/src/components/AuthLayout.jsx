/**
 * AuthLayout
 * ----------
 * Split-screen frame shared by Login and Register.
 *   Left  : brand mark, serif headline, the form (children)
 *   Right : full-bleed photograph (/login-hero.jpg, served from /public)
 * Under 900px the image panel is hidden and the form takes full width.
 */

export default function AuthLayout({ heading, subheading, children }) {
  return (
    <div className="auth-split">
      <section className="auth-left">
        <div className="auth-brand">Inventory MS</div>

        <div className="auth-form-area">
          <h1 className="auth-heading">{heading}</h1>
          {subheading && <p className="auth-subheading">{subheading}</p>}
          {children}
        </div>

        <div className="auth-foot">Inventory &amp; Warehouse Management System</div>
      </section>

      <aside className="auth-right" aria-hidden="true">
        <div
          className="auth-photo"
          style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/login-hero.jpg)` }}
        />
      </aside>
    </div>
  );
}
