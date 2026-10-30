// frontend/assets/js/route-guard.js
(function () {
  const isLoggedIn = localStorage.getItem("akademiko_logged_in") === "true";
  const userRole = (localStorage.getItem("akademiko_role") || "").toLowerCase();
  const currentPath = window.location.pathname.toLowerCase();

  // If not logged in and not already on the login page, redirect to login
  if (!isLoggedIn) {
    if (!currentPath.includes("login.html")) {
      window.location.replace("../auth/login.html");
    }
    return;
  }

  // Prevent logged-in users from going back to login without logging out
  if (currentPath.includes("login.html")) {
    if (userRole === "admin") window.location.replace("../admin/admin-dashboard.html");
    else if (userRole === "faculty") window.location.replace("../faculty/faculty-dashboard.html");
    else if (userRole === "student") window.location.replace("../student/student-dashboard.html");
    return;
  }

  // Check portal boundary permissions
  const isAdminPath = currentPath.includes("/admin/");
  const isFacultyPath = currentPath.includes("/faculty/");
  const isStudentPath = currentPath.includes("/student/");

  if (isAdminPath && userRole !== "admin") {
    alert("⛔ Access Denied: Administrator clearance required.");
    routeToProperDashboard(userRole);
  } else if (isFacultyPath && userRole !== "faculty") {
    alert("⛔ Access Denied: Faculty instructor clearance required.");
    routeToProperDashboard(userRole);
  } else if (isStudentPath && userRole !== "student") {
    alert("⛔ Access Denied: Student portal only.");
    routeToProperDashboard(userRole);
  }

  function routeToProperDashboard(role) {
    if (role === "admin") window.location.replace("../admin/admin-dashboard.html");
    else if (role === "faculty") window.location.replace("../faculty/faculty-dashboard.html");
    else window.location.replace("../student/student-dashboard.html");
  }
})();