import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, List, Section } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using Shortlist, for candidates and employers.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro={
        <p>
          These terms are the agreement between you and Shortlist, run by Grant Cox, when you use the site. By creating
          an account you agree to them and to the <Link href="/privacy" className="link">privacy policy</Link>. If you
          don't agree, please don't use Shortlist.
        </p>
      }
    >
      <Section title="1. Who can use Shortlist">
        <p>
          You need to be 18 or older. Each account is for one person or one organisation. Keep your password to
          yourself; you're responsible for what happens on your account.
        </p>
      </Section>

      <Section title="2. What Shortlist is, and isn't">
        <p>
          Shortlist is a place for employers to advertise jobs and for candidates to apply. We're not a recruitment
          agency or an employer, we don't take part in hiring decisions, and we're not a party to any job offer or
          employment contract. We don't check every job or every profile, so use your own judgement.
        </p>
        <p>
          Match scores compare a profile with what the employer asked for. They're a guide to help both sides, not a
          verdict, and they rely on information people provide about themselves.
        </p>
      </Section>

      <Section title="3. If you're looking for work">
        <List>
          <li>Keep your profile accurate and up to date, and answer must-have questions honestly.</li>
          <li>Only apply with your own details and your own CV.</li>
          <li>Shortlist is free for candidates. We'll never charge you to apply, and neither may any employer here.</li>
        </List>
      </Section>

      <Section title="4. If you're hiring">
        <List>
          <li>Only post real, current jobs you're authorised to fill, and keep each listing accurate, including pay where you show it.</li>
          <li>
            Your listings and hiring must follow South African law, including the Employment Equity Act and the Basic
            Conditions of Employment Act. Don't advertise in a way that unfairly discriminates.
          </li>
          <li>Never ask candidates for money, for any reason, or for bank details or ID numbers before you've made an offer.</li>
          <li>
            Use applicants' information only for the job they applied for, keep it secure, and delete it when you no
            longer need it. You're responsible for it under POPIA once you've downloaded or copied it.
          </li>
          <li>Only invite people from the talent pool to apply for a real, open job.</li>
        </List>
      </Section>

      <Section title="5. What's not allowed">
        <List>
          <li>Scams, fake jobs, pyramid schemes, or anything that asks people to pay to work.</li>
          <li>Harassing, threatening, abusive or discriminatory messages or content.</li>
          <li>Spam: unsolicited advertising, or messaging people about anything other than work and hiring.</li>
          <li>Pretending to be someone else, or another company.</li>
          <li>Collecting other users' information in bulk, copying the site with automated tools, or trying to get around its security or limits.</li>
          <li>Uploading anything that contains viruses or malicious code.</li>
        </List>
        <p>
          If you see something that breaks these rules, use "Report this job" on the job, or block the person in
          Messages, and let us know at <Contact />.
        </p>
      </Section>

      <Section title="6. What we can do">
        <p>
          To keep Shortlist safe and useful, we can hide or remove jobs and other content, limit features, or suspend or
          close accounts that break these terms or put other users at risk. Where it's reasonable, we'll tell you why.
          Jobs reported by several people are hidden automatically until they've been reviewed.
        </p>
      </Section>

      <Section title="7. Your content">
        <p>
          You own what you post, such as your profile, CV, jobs and messages. You let us store and show it as needed to
          run Shortlist, as described in the privacy policy, for as long as it's on the site.
        </p>
      </Section>

      <Section title="8. The service">
        <p>
          Shortlist is free and provided as it is. We work to keep it running and accurate, but we can't promise it will
          always be available or free of errors, and we may change or stop features. We're not responsible for what
          employers or candidates say or do, including whether a job is offered or accepted.
        </p>
        <p>
          As far as the law allows, we're not liable for indirect losses from using Shortlist. Nothing in these terms
          limits rights you have under the Consumer Protection Act or other law that can't be limited.
        </p>
      </Section>

      <Section title="9. Leaving">
        <p>You can delete your account at any time from your profile or company page, which deletes your information as the privacy policy describes.</p>
      </Section>

      <Section title="10. Changes and the law">
        <p>
          We may update these terms. We'll change the date at the top, and tell account holders by email about
          significant changes. These terms are governed by the law of South Africa. Questions? Write to <Contact />.
        </p>
      </Section>
    </LegalPage>
  );
}
