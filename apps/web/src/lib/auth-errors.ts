export function authErrorMessage(caught: unknown) {
  const message = caught instanceof Error ? caught.message : "خطایی رخ داد.";
  const normalized = message.toLowerCase();

  if (normalized.includes("wait"))
    return "برای دریافت کد جدید کمی صبر کنید.";
  if (normalized.includes("verification code"))
    return "کد واردشده نادرست یا منقضی شده است.";
  if (normalized.includes("credentials"))
    return "شماره یا نام‌کاربری و رمز عبور درست نیست.";
  if (normalized.includes("account was not found"))
    return "حسابی با این مشخصات پیدا نشد.";
  if (
    normalized.includes("session") &&
    (normalized.includes("invalid") || normalized.includes("expired"))
  )
    return "نشست شما منقضی شده است؛ دوباره وارد حساب شوید.";
  if (normalized.includes("instagram username") && normalized.includes("already"))
    return "این آیدی اینستاگرام قبلاً استفاده شده است.";
  if (normalized.includes("email") && normalized.includes("already"))
    return "این ایمیل قبلاً برای حساب دیگری استفاده شده است.";
  if (normalized.includes("username") && normalized.includes("already"))
    return "این نام‌کاربری قبلاً استفاده شده است.";
  if (normalized.includes("mobile") && normalized.includes("already"))
    return "این شماره تماس قبلاً استفاده شده است.";
  if (normalized.includes("email"))
    return "فرمت ایمیل درست نیست؛ نمونه: name@example.com";
  if (normalized.includes("instagram"))
    return "فرمت آیدی اینستاگرام درست نیست.";
  if (normalized.includes("password"))
    return "رمز جدید باید حداقل ۸ کاراکتر و شامل حرف کوچک و بزرگ لاتین، عدد و نماد باشد.";
  if (normalized.includes("username"))
    return "نام‌کاربری باید ۳ تا ۳۰ کاراکتر و شامل حداقل یک حرف لاتین باشد.";
  if (normalized.includes("mobile"))
    return "شماره تماس باید ۱۱ رقم و با ۰۹ شروع شود.";

  return "درخواست انجام نشد. اطلاعات را بررسی و دوباره تلاش کنید.";
}

export function isRegistrationConflict(caught: unknown) {
  const message = caught instanceof Error ? caught.message.toLowerCase() : "";
  return (
    message.includes("already in use") ||
    message.includes("already used")
  );
}
