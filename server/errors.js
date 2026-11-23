export class AccountError extends Error {
    constructor(code, status) {
        super(code);
        this.name = "AccountError";
        this.code = code;
        this.status = status;
    }
}

export function isSqliteConstraint(error) {
    return error?.errcode === 19 || /constraint/i.test(error?.message ?? "");
}

export function isSqliteBusy(error) {
    return error?.errcode === 5 || /database is locked|sqlite_busy/i.test(error?.message ?? "");
}
