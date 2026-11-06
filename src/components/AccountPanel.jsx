import { useEffect, useState } from "react";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import {
    ApiError,
    activateAccount,
    changePassword,
    createAccount,
    deactivateAccount,
    listAccounts,
    loadSession,
    login,
    logout,
    messageFor,
    resetAccountPassword,
    setupAccount,
} from "../accounts/api.js";

function describe(error) {
    if (error instanceof ApiError) {
        return messageFor(error.code);
    }
    return messageFor("network_error");
}

function Feedback({ error, notice }) {
    return (
        <>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            {notice ? <Alert variant="success">{notice}</Alert> : null}
        </>
    );
}

function TextField({ id, label, type = "text", autoComplete, value, onChange }) {
    return (
        <Form.Group className="mb-3">
            <Form.Label htmlFor={id}>{label}</Form.Label>
            <Form.Control
                id={id}
                size="lg"
                type={type}
                autoComplete={autoComplete}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </Form.Group>
    );
}

function PasswordChangeForm({ onSubmit, busy }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    return (
        <Form
            className="mt-3"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit(currentPassword, newPassword);
            }}
        >
            <TextField
                id="current-password"
                label="Aktuelles Passwort"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
            />
            <TextField
                id="new-password"
                label="Neues Passwort"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={setNewPassword}
            />
            <Button type="submit" size="lg" disabled={busy}>Passwort speichern</Button>
        </Form>
    );
}

function AccountRow({ account, pending, busy, onPending, onDeactivate, onActivate, onReset }) {
    const resetting = pending?.type === "reset" && pending.id === account.id;
    const deactivating = pending?.type === "deactivate" && pending.id === account.id;
    return (
        <li className="list-group-item">
            <div>
                <strong>{account.username}</strong>
                {account.administrator ? " · Administrator" : ""}
                {account.disabled ? " · deaktiviert" : " · aktiv"}
                {account.mustChangePassword ? " · Passwortänderung erforderlich" : ""}
            </div>
            <div className="d-grid gap-2 mt-2">
                {account.disabled ? (
                    <Button type="button" size="lg" variant="outline-primary" disabled={busy} onClick={() => onActivate(account.id)}>
                        Aktivieren
                    </Button>
                ) : (
                    <Button type="button" size="lg" variant="outline-secondary" disabled={busy} onClick={() => onPending({ type: "deactivate", id: account.id })}>
                        Deaktivieren
                    </Button>
                )}
                {resetting ? (
                    <>
                        <TextField
                            id={`reset-password-${account.id}`}
                            label={`Temporäres Passwort für ${account.username}`}
                            type="password"
                            autoComplete="new-password"
                            value={pending.password ?? ""}
                            onChange={(password) => onPending({ type: "reset", id: account.id, password })}
                        />
                        <p>Temporäres Passwort für {account.username} jetzt setzen? Es wird persönlich übergeben und nicht per E-Mail versendet.</p>
                        <Button type="button" size="lg" variant="danger" disabled={busy} onClick={() => onReset(account.id, pending.password ?? "")}>Zurücksetzen bestätigen</Button>
                        <Button type="button" size="lg" variant="outline-secondary" disabled={busy} onClick={() => onPending(null)}>Abbrechen</Button>
                    </>
                ) : (
                    <Button type="button" size="lg" variant="outline-secondary" disabled={busy} onClick={() => onPending({ type: "reset", id: account.id, password: "" })}>
                        Passwort zurücksetzen
                    </Button>
                )}
            </div>
            {deactivating ? (
                <div className="mt-2">
                    <p>Konto {account.username} deaktivieren? Bestehende Sitzungen werden widerrufen. Das Konto bleibt erhalten.</p>
                    <div className="d-grid gap-2">
                        <Button type="button" size="lg" variant="danger" disabled={busy} onClick={() => onDeactivate(account.id)}>Deaktivieren bestätigen</Button>
                        <Button type="button" size="lg" variant="outline-secondary" disabled={busy} onClick={() => onPending(null)}>Abbrechen</Button>
                    </div>
                </div>
            ) : null}
        </li>
    );
}

function Flyout({ children }) {
    return (
        <div
            className="position-absolute end-0 mt-2 p-3 bg-white border rounded shadow text-start"
            style={{ width: "min(24rem, calc(100vw - 2rem))", zIndex: 20 }}
        >
            {children}
        </div>
    );
}

export default function AccountPanel() {
    const [phase, setPhase] = useState("loading");
    const [account, setAccount] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [pending, setPending] = useState(null);
    const [open, setOpen] = useState(false);
    const [accountsOpen, setAccountsOpen] = useState(false);
    const [setupToken, setSetupToken] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [administrator, setAdministrator] = useState(false);

    async function perform(action) {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await action();
        } catch (actionError) {
            setError(describe(actionError));
        } finally {
            setBusy(false);
        }
    }

    function run(action) {
        perform(action).catch((actionError) => {
            setError(describe(actionError));
        });
    }

    async function applySession(session) {
        setPhase(session.phase);
        setAccount(session.account);
        setOpen(session.phase === "mustChange");
        setShowPassword(false);
        setAccountsOpen((current) => (
            session.phase === "authenticated" && session.account?.administrator ? current : false
        ));
        if (session.phase === "authenticated" && session.account?.administrator) {
            const listed = await listAccounts();
            setAccounts(listed.accounts);
        } else {
            setAccounts([]);
        }
    }

    useEffect(() => {
        let cancelled = false;
        loadSession()
            .then((session) => {
                if (cancelled) {
                    return undefined;
                }
                setPhase(session.phase);
                setAccount(session.account);
                setOpen(session.phase === "mustChange");
                if (session.phase === "authenticated" && session.account?.administrator) {
                    return listAccounts();
                }
                return undefined;
            })
            .then((listed) => {
                if (!cancelled && listed?.accounts) {
                    setAccounts(listed.accounts);
                }
            })
            .catch((loadError) => {
                if (!cancelled) {
                    setPhase("unavailable");
                    setError(describe(loadError));
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (phase === "loading") {
        return <p>Konto wird geladen …</p>;
    }

    const feedback = (error || notice) && !accountsOpen
        ? <Feedback error={error} notice={notice} />
        : null;

    function toggleLabel() {
        if (open) {
            return "Schließen";
        }
        if (phase === "setup") {
            return "Einrichten";
        }
        if (phase === "login") {
            return "Anmelden";
        }
        if (phase === "mustChange") {
            return "Passwort ändern";
        }
        return account.username;
    }

    return (
        <section className="text-end" aria-label="Konto">
            {phase === "unavailable" ? feedback : null}
            {phase === "unavailable" ? null : (
                <>
                    {feedback ? (
                        <div className="mb-2 ms-auto text-start" style={{ width: "min(24rem, calc(100vw - 2rem))" }}>
                            {feedback}
                        </div>
                    ) : null}
                    <div className="position-relative d-inline-block">
                        <Button
                            type="button"
                            size="lg"
                            variant="outline-primary"
                            aria-expanded={open}
                            disabled={busy}
                            onClick={() => setOpen((value) => !value)}
                        >
                            {toggleLabel()}
                        </Button>
                        {open && phase === "setup" ? (
                            <Flyout>
                                <Form onSubmit={(event) => {
                                    event.preventDefault();
                                    run(async () => {
                                        await setupAccount({ username, password, setupToken });
                                        setSetupToken("");
                                        setPassword("");
                                        setNotice("Das Administratorkonto wurde angelegt.");
                                        await applySession(await loadSession());
                                    });
                                }}>
                                    <h2 className="h5">Einrichtung</h2>
                                    <p>Das Einrichtungstoken stellt der Betreiber bereit. Es ist nicht Teil der Anwendung.</p>
                                    <TextField id="setup-token" label="Einrichtungstoken" type="password" autoComplete="off" value={setupToken} onChange={setSetupToken} />
                                    <TextField id="setup-username" label="Benutzername" autoComplete="username" value={username} onChange={setUsername} />
                                    <TextField id="setup-password" label="Passwort" type="password" autoComplete="new-password" value={password} onChange={setPassword} />
                                    <Button type="submit" size="lg" disabled={busy}>Einrichtung abschließen</Button>
                                </Form>
                            </Flyout>
                        ) : null}
                        {open && phase === "login" ? (
                            <Flyout>
                                <Form onSubmit={(event) => {
                                    event.preventDefault();
                                    run(async () => {
                                        await login({ username, password });
                                        setPassword("");
                                        await applySession(await loadSession());
                                    });
                                }}>
                                    <h2 className="h5">Anmelden</h2>
                                    <TextField id="login-username" label="Benutzername" autoComplete="username" value={username} onChange={setUsername} />
                                    <TextField id="login-password" label="Passwort" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
                                    <Button type="submit" size="lg" disabled={busy}>Anmelden</Button>
                                </Form>
                            </Flyout>
                        ) : null}
                        {open && phase === "mustChange" ? (
                            <Flyout>
                                <h2 className="h5">Passwort ändern</h2>
                                <p>Angemeldet als <strong>{account.username}</strong>. Das Passwort muss geändert werden, bevor andere Funktionen verfügbar sind.</p>
                                <PasswordChangeForm
                                    busy={busy}
                                    onSubmit={(currentPassword, newPassword) => run(async () => {
                                        await changePassword({ currentPassword, newPassword });
                                        setNotice("Das Passwort wurde geändert. Bitte neu anmelden.");
                                        await applySession(await loadSession());
                                    })}
                                />
                                <Button className="mt-3" type="button" size="lg" variant="outline-secondary" disabled={busy} onClick={() => run(async () => {
                                    await logout();
                                    await applySession(await loadSession());
                                })}>
                                    Abmelden
                                </Button>
                            </Flyout>
                        ) : null}
                        {open && phase === "authenticated" ? (
                            <Flyout>
                                <h2 className="h5">Konto</h2>
                                <p>Angemeldet als <strong>{account.username}</strong></p>
                                <div className="d-grid gap-2">
                                    <Button type="button" size="lg" variant="outline-secondary" disabled={busy} onClick={() => run(async () => {
                                        await logout();
                                        await applySession(await loadSession());
                                    })}>
                                        Abmelden
                                    </Button>
                                    <Button type="button" size="lg" variant="outline-primary" disabled={busy} onClick={() => setShowPassword((value) => !value)}>
                                        Eigenes Passwort ändern
                                    </Button>
                                    {account.administrator ? (
                                        <Button type="button" size="lg" variant="outline-primary" disabled={busy} onClick={() => {
                                            setOpen(false);
                                            setAccountsOpen(true);
                                        }}>
                                            Konten verwalten
                                        </Button>
                                    ) : null}
                                </div>
                                {showPassword ? (
                                    <PasswordChangeForm
                                        busy={busy}
                                        onSubmit={(currentPassword, newPassword) => run(async () => {
                                            await changePassword({ currentPassword, newPassword });
                                            setNotice("Das Passwort wurde geändert. Bitte neu anmelden.");
                                            await applySession(await loadSession());
                                        })}
                                    />
                                ) : null}
                            </Flyout>
                        ) : null}
                    </div>
                    {account?.administrator ? (
                        <Modal show={accountsOpen} onHide={() => setAccountsOpen(false)} size="lg" centered animation={false}>
                            <Modal.Header closeButton>
                                <Modal.Title>Konten</Modal.Title>
                            </Modal.Header>
                            <Modal.Body className="text-start">
                                <p>Angemeldet als <strong>{account.username}</strong></p>
                                {accountsOpen ? <Feedback error={error} notice={notice} /> : null}
                                <p>
                                    Neue und zurückgesetzte Passwörter teilt der Administrator persönlich mit.
                                    Die Anwendung versendet keine E-Mail.
                                </p>
                                <Form className="mb-3" onSubmit={(event) => {
                                    event.preventDefault();
                                    run(async () => {
                                        const created = await createAccount({
                                            username,
                                            password,
                                            administrator,
                                        });
                                        setPassword("");
                                        setUsername("");
                                        setAdministrator(false);
                                        setNotice(`Konto ${created.username} wurde angelegt. Das Passwort bitte persönlich mitteilen.`);
                                        await applySession(await loadSession());
                                    });
                                }}>
                                    <TextField id="create-username" label="Benutzername" autoComplete="off" value={username} onChange={setUsername} />
                                    <TextField id="create-password" label="Passwort" type="password" autoComplete="new-password" value={password} onChange={setPassword} />
                                    <Form.Check
                                        className="mb-3"
                                        id="create-administrator"
                                        label="Administrator"
                                        checked={administrator}
                                        onChange={(event) => setAdministrator(event.target.checked)}
                                    />
                                    <Button type="submit" size="lg" disabled={busy}>Konto anlegen</Button>
                                </Form>
                                <ul className="list-group">
                                    {accounts.map((entry) => (
                                        <AccountRow
                                            key={entry.id}
                                            account={entry}
                                            pending={pending}
                                            busy={busy}
                                            onPending={setPending}
                                            onActivate={(id) => run(async () => {
                                                await activateAccount(id);
                                                setPending(null);
                                                await applySession(await loadSession());
                                            })}
                                            onDeactivate={(id) => run(async () => {
                                                await deactivateAccount(id);
                                                setPending(null);
                                                await applySession(await loadSession());
                                            })}
                                            onReset={(id, temporaryPassword) => run(async () => {
                                                await resetAccountPassword(id, temporaryPassword);
                                                setPending(null);
                                                setNotice("Das temporäre Passwort ist gesetzt. Bitte persönlich mitteilen.");
                                                await applySession(await loadSession());
                                            })}
                                        />
                                    ))}
                                </ul>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button type="button" size="lg" variant="outline-secondary" onClick={() => setAccountsOpen(false)}>Schließen</Button>
                            </Modal.Footer>
                        </Modal>
                    ) : null}
                </>
            )}
        </section>
    );
}
