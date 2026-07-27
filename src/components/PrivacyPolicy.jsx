const LAST_UPDATED = 'July 28, 2026';
const CONTACT_EMAIL = 'meirsendik@gmail.com';

export function PrivacyPolicy() {
  return (
    <div dir="ltr" className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-10 text-slate-200">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100">Privacy Policy</h1>
          <p className="mt-1 text-sm text-slate-400">Chess Coach — Last updated: {LAST_UPDATED}</p>
        </div>

        <p>
          This Privacy Policy describes how the "Chess Coach" application ("the App", "we", "us") handles
          information when you use it. We built the App to keep your data on your own device as much as
          possible, and to be transparent about the few third-party services it relies on.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Information We Collect</h2>
          <p>
            The App does not require an account, a sign-up, or a login. It does not collect or store any
            personally identifiable information (PII) such as your name, email address, or phone number.
          </p>
          <p>Game-related data — such as your internal rating, puzzle progress, achievement badges, daily streak,
            board color preferences, and saved in-progress games — is stored{' '}
            <strong>locally on your device only</strong>, using your browser's or device's local storage. This
            data is never transmitted to us or to any server we control, and it is automatically removed if you
            uninstall the App or clear its storage.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Third-Party Services</h2>
          <p>The App uses a small number of third-party services to provide its features:</p>
          <ul className="list-disc space-y-2 pr-0 pl-5">
            <li>
              <strong>Google AdSense.</strong> The web version of the App displays advertisements served by
              Google AdSense, which may use cookies or device identifiers to show relevant ads. Google's use of
              this data is governed by Google's own Privacy Policy and, where applicable, its Ads Personalization
              settings.
            </li>
            <li>
              <strong>AI-based move analysis.</strong> When you ask the coach for an explanation of a move or a
              position, the relevant chess position (not any personal information) is sent to a third-party AI
              service in order to generate that explanation.
            </li>
            <li>
              <strong>Online multiplayer (peer-to-peer).</strong> The "play a friend online" feature connects two
              devices directly using WebRTC, brokered by a public signaling/relay service. As part of establishing
              this connection, your device's IP address may be visible to the service and to the peer you connect
              with. No chess data from this feature is stored on any server.
            </li>
            <li>
              <strong>Google Fonts.</strong> The App loads typefaces from Google Fonts' content delivery network.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Information We Do Not Collect</h2>
          <p>
            We do not operate user accounts, we do not run our own analytics or tracking of individual users, and
            we do not sell or share personal information with third parties for their own marketing purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Children's Privacy</h2>
          <p>
            The App is a general-audience chess coaching tool and does not knowingly collect personal information
            from children. Because no account or personal data is required to use the App, no child-specific data
            is collected.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Data Security</h2>
          <p>
            Since gameplay data is stored locally on your own device rather than on our servers, its security
            depends on the security of your device and browser. We recommend keeping your device's operating
            system and browser up to date.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page with an
            updated "Last updated" date.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, you can contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sky-400 underline hover:text-sky-300">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
