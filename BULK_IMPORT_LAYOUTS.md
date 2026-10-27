# Bulk Import Excel Layouts

These files can be opened in Microsoft Excel and saved as `.xlsx` before uploading. The importer reads the first worksheet only. CSV, XLSX, and XLS files are supported.

## 1. Teacher Import

Upload from **Admin > Teachers > Bulk Import**.

### Required columns

| Column | Required | Example | Notes |
|---|---|---|---|
| `firstName` | Yes | Maria | Teacher's first name; used to generate the temporary password |
| `lastName` | Yes | Santos | Teacher's last name |
| `email` | Yes | maria.santos@school.edu | Must be a valid, unused email address |

Legacy files with `name,email` columns are still supported. The importer splits the full name at the first space.

### Optional columns

| Column | Example | Notes |
|---|---|---|
| `dateOfBirth` | 1985-04-12 | Use `YYYY-MM-DD` |
| `gender` | Female | Any text is accepted |
| `phone` | 09171234567 | Keep as text in Excel so leading zeroes remain |
| `address` | 12 Main Street | Full address |

The system generates a temporary password from the first name followed by a unique four-digit code and emails it to new teachers. Do not add a `password` column. If email delivery fails, the admin page displays the password for manual delivery.

## 2. Student Import

Upload from **Admin > Students > Bulk Import**.

### Required columns

| Column | Required | Example | Notes |
|---|---|---|---|
| `firstName` | Yes | John | Student's first name |
| `lastName` | Yes | Doe | Student's last name |
| `email` | Yes | john.doe@school.edu | Must be a valid, unused email address |
| `grade` | Yes | 11 | `11` becomes `G11`; `G11` is also accepted |
| `section` | Yes | ABM-ARISTOTLE | Must exactly match an existing section name |

Legacy files with `name,email,grade,section` columns are still supported. The importer splits the full name at the first space.

### Optional columns

| Column | Example | Notes |
|---|---|---|
| `dateOfBirth` | 2008-05-12 | Use `YYYY-MM-DD` |
| `gender` | Male | Optional |
| `phone` | 09181234567 | Keep as text in Excel |
| `address` | 24 Rizal Avenue | Optional |
| `guardianName` | Mary Doe | Optional |
| `guardianPhone` | 09191234567 | Keep as text in Excel |

Student IDs and temporary passwords are generated automatically. The temporary password is emailed to the new student; if delivery fails, the admin import results show the password for manual delivery.

## 3. Attendance Class-List Import

Upload from **Teacher > Attendance > Bulk Import Class List** after selecting the section and subject.

### Accepted columns

| Column | Required | Example | Notes |
|---|---|---|---|
| `name` | Yes | John Doe | Student's full name |
| `email` | Yes | john.doe@school.edu | Identifies an existing student or creates a new one |
| `studentId` | No | G11-001 | Optional; use to match an existing student or request a specific ID for a new student |

Name and email are required, just like the Add Student form. Student IDs are generated automatically when omitted. Existing students can be matched by email, and new students are created in the selected section and added to the selected subject.

This import creates the class list/enrollment. It does not import attendance statuses or dates. Attendance is recorded in the attendance screen after the class list is loaded.

## Excel Checklist

- Put the column headers in row 1.
- Keep headers spelled exactly as shown, without spaces.
- Put one person per row.
- Do not merge cells or add title rows above the headers.
- Use the first worksheet.
- Keep phone numbers formatted as **Text** to preserve leading zeroes.
- Make sure the file contains no duplicate emails or already-existing accounts when using the admin imports.
