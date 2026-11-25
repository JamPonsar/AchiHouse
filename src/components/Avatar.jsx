import { fullName, initialsOf } from "../lib/membership.js";

// A member's profile photo, or their initials in a circle when they haven't added one
export default function Avatar({ user, size = 40, className = "" }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  return user?.photo ? (
    <img className={`avatar ${className}`} src={user.photo} alt={fullName(user)} style={style} />
  ) : (
    <span className={`avatar avatar-initials ${className}`} style={style} aria-label={fullName(user)}>{initialsOf(user)}</span>
  );
}
