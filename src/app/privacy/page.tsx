import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, List, Section } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Shortlist collects, why, who sees it, and your rights under POPIA.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          Shortlist is a job board that scores candidates against jobs. To do that we hold personal information, including
          CVs. This page explains what we collect, why, who can see it, where it's kept and the rights you have under the
          Protection of Personal Information Act (POPIA). We've tried to write it plainly.
        </p>
      }
    >
      <Section title="1. Who we are">
        <p>
          Shortlist is run by Grant Cox, an individual based in Stellenbosch, Western Cape, South Africa. Grant is the
          responsible party for your information under POPIA and acts as its information officer. You can reach him at{" "}
          <Contact />.
        </p>
      </Section>

      <Section title="2. What we collect">
        <p>
          <strong className="text-ink">Everyone with an account:</strong> your email address, a password (stored only as
          a one-way hash, so we can't read it), your username, and your settings, such as which emails you want.
        </p>
        <p>
          <strong className="text-ink">Candidates:</strong> the profile you fill in (name, phone number, where you're
          based, highest qualification and field of study, years of experience, skills, a short summary, when you can
          start, whether you have transport and would relocate) and your CV. When you apply, we keep your answers to the
          job's must-have questions and any note you write. Employers can add their own notes, a rating and a status to
          your application.
        </p>
        <p>
          <strong className="text-ink">Employers:</strong> your company name, where you're based, a description and
          website, and the jobs you post.
        </p>
        <p>
          <strong className="text-ink">What you do on the site:</strong> jobs you save, your job alert choices, whether
          you've joined the talent pool, invitations you send or receive, messages you send to other users, and jobs you
          report.
        </p>
        <p>
          <strong className="text-ink">Technical information:</strong> a login cookie, a count of how many times each job
          is viewed (not who viewed it), and the short-lived server logs our hosting provider keeps, which include IP
          addresses.
        </p>
        <p>
          Filling in a profile is voluntary, but you can't apply for jobs without the parts marked as required, because
          employers need them to consider you.
        </p>
      </Section>

      <Section title="3. Why we use it">
        <List>
          <li>To run your account and keep it secure.</li>
          <li>To score your profile against jobs and show you the breakdown.</li>
          <li>To pass your application to the employer you apply to.</li>
          <li>If you join the talent pool, to show employers an anonymous version of your profile.</li>
          <li>To send the emails you've chosen: application receipts and updates, job alerts, invitations and password resets.</li>
          <li>To deliver messages between users.</li>
          <li>To keep the site safe: reviewing reported jobs, limiting spam and investigating misuse.</li>
        </List>
        <p>
          We use your information because you agreed to it (for example, when you tick the consent box on your profile),
          because we need it to provide the service you signed up for, or because we have a legitimate interest in
          keeping the site safe. We don't sell your information, show adverts or use it for anything unrelated to finding
          work or hiring.
        </p>
      </Section>

      <Section title="4. Who can see what">
        <List>
          <li>
            <strong className="text-ink">Employers you apply to</strong> see your profile, CV, answers and note, including
            your name, email address and phone number. Employers you haven't applied to don't.
          </li>
          <li>
            <strong className="text-ink">Employers browsing the talent pool</strong> (only if you've switched it on) see
            your qualification, field of study, years of experience, skills, the city you're in, when you can start and
            whether you have transport. Never your name, contact details, summary or CV, unless you apply.
          </li>
          <li>
            <strong className="text-ink">People you message</strong> see your name and username, never your email
            address.
          </li>
          <li>
            <strong className="text-ink">Everyone</strong> can see employers' company details and open jobs.
          </li>
          <li>
            <strong className="text-ink">The site's administrator</strong> can see account information when it's needed
            to support you, review a report or deal with misuse.
          </li>
        </List>
        <p>
          Employers can download their applicants' details. Once they have, they're responsible for that copy under
          POPIA, and our terms require them to use it only for that recruitment.
        </p>
      </Section>

      <Section title="5. Automatic scoring">
        <p>
          Shortlist works out a match score by comparing your profile with what the employer asked for, and orders
          applicants by it. The score only decides the order. It never rejects anyone: every applicant is shown to the
          employer, and a person at the employer makes every decision. You can always see your own score and exactly how
          it was worked out on each job page.
        </p>
      </Section>

      <Section title="6. Service providers, and where your information is stored">
        <p>We use a small number of providers to run Shortlist. Each only gets what it needs for its job:</p>
        <List>
          <li><strong className="text-ink">Vercel</strong> hosts the website.</li>
          <li><strong className="text-ink">Neon</strong> hosts the database where your information and CV are kept.</li>
          <li><strong className="text-ink">Google (Gmail)</strong> sends our emails.</li>
          <li>
            <strong className="text-ink">OpenStreetMap, through Photon</strong> suggests places as you type a location.
            Only what you type in that box is sent.
          </li>
          <li>
            <strong className="text-ink">Anthropic</strong> reads your CV, only if you use "Fill in from my CV", to
            suggest profile details. The CV is used to answer that request and isn't used to train their AI.
          </li>
          <li>
            <strong className="text-ink">Google for Jobs</strong> may be sent job adverts so they appear in Google's job
            search. Candidate information is never sent.
          </li>
        </List>
        <p>
          Vercel and Neon store information on servers in the United States, so your information leaves South Africa.
          We rely on these providers' data protection terms, which require them to protect it to a standard similar to
          POPIA, and on the transfer being necessary to provide the service you asked for (section 72 of POPIA).
        </p>
      </Section>

      <Section title="7. How long we keep it">
        <p>
          We keep your information while your account is open. When you delete your account (from your profile or
          company page), we permanently delete your profile, CV, applications, saved jobs, alerts, invitations, messages
          and conversations. Copies in our database provider's backups are overwritten within a few days. Employers'
          downloaded copies are their responsibility, as above.
        </p>
      </Section>

      <Section title="8. Your rights">
        <List>
          <li><strong className="text-ink">See your information:</strong> most of it is on your profile and dashboard. Ask us for a copy of the rest.</li>
          <li><strong className="text-ink">Correct it:</strong> edit your profile, company details or settings at any time.</li>
          <li><strong className="text-ink">Delete it:</strong> delete your account yourself, or ask us to.</li>
          <li>
            <strong className="text-ink">Change your mind:</strong> leave the talent pool, turn off emails in{" "}
            <Link href="/settings" className="link">Settings</Link>, or use the unsubscribe link in any email.
          </li>
          <li><strong className="text-ink">Object</strong> to how we use your information, on reasonable grounds.</li>
          <li>
            <strong className="text-ink">Complain</strong> to the Information Regulator if you're unhappy with how we've
            handled it: <a href="https://inforegulator.org.za" className="link" rel="noopener" target="_blank">inforegulator.org.za</a>,{" "}
            <a href="mailto:enquiries@inforegulator.org.za" className="link">enquiries@inforegulator.org.za</a>. We'd
            appreciate the chance to put it right first.
          </li>
        </List>
        <p>
          To make a request, write to <Contact /> from the email address on your account. We'll reply within 30 days.
        </p>
      </Section>

      <Section title="9. Keeping it safe">
        <p>
          Passwords are hashed, the site only works over an encrypted connection, CVs can only be opened by you and the
          employers you've applied to, and links in emails are signed so they can't be tampered with. No system is
          perfectly secure. If someone gets unauthorised access to your information, we'll tell you and the Information
          Regulator as POPIA requires.
        </p>
      </Section>

      <Section title="10. Cookies">
        <p>
          We use one cookie, to keep you logged in. Your browser also remembers, for that tab only, your last job search
          and which jobs you've viewed, so view counts aren't inflated. There are no advertising or tracking cookies and
          no analytics services.
        </p>
      </Section>

      <Section title="11. Age">
        <p>You need to be 18 or older to create an account.</p>
      </Section>

      <Section title="12. Changes">
        <p>
          If we change how we use your information, we'll update this page and the date at the top, and tell account
          holders by email when the change is significant.
        </p>
      </Section>
    </LegalPage>
  );
}
