import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { api } from "../../api/client";
import type { SponsorContactConfig } from "../../api/types";
import { PrimeIcon } from "../PrimeIcon";

import { HospyLogo } from "../brand/HospyLogo";

import { useLocaleCurrency } from "../../context/LocaleCurrencyContext";

import {

  FOOTER_CONTACT,

  FOOTER_CURRENCIES,

  FOOTER_LANGUAGES,

  FOOTER_PAYMENT_METHODS,

  FOOTER_SOCIAL,

  FOOTER_TRUST,

} from "../../data/footerLinks";

import { FooterSocialIcon } from "./FooterSocialIcon";

import "../../styles/footer.css";



const YEAR = new Date().getFullYear();



type FooterContact = {
  email: string;
  phone: string;
  whatsapp: string;
};

export function SiteFooter() {

  const { language, currency, setLanguage, setCurrency, t } = useLocaleCurrency();

  const [cookieHint, setCookieHint] = useState<string | null>(null);
  const [contact, setContact] = useState<FooterContact>({
    email: FOOTER_CONTACT.email,
    phone: FOOTER_CONTACT.phone,
    whatsapp: FOOTER_CONTACT.whatsapp,
  });

  useEffect(() => {
    api
      .get<SponsorContactConfig>("/anuncios/config/", false)
      .then((cfg) => {
        setContact({
          email: cfg.admin_email?.trim() || FOOTER_CONTACT.email,
          phone: cfg.admin_phone?.trim() || FOOTER_CONTACT.phone,
          whatsapp: cfg.admin_whatsapp_url?.trim() || FOOTER_CONTACT.whatsapp,
        });
      })
      .catch(() => {
        /* mantiene valores por defecto */
      });
  }, []);



  const openCookiePrefs = () => {

    setCookieHint(t("footer.cookieHint"));

    window.setTimeout(() => setCookieHint(null), 5000);

  };



  const companyLinks = [

    { label: t("footer.about"), to: "/sobre-nosotros" },

    { label: t("footer.blog"), to: "/centro-ayuda" },

    { label: t("footer.careers"), to: "/contacto" },

    { label: t("footer.faq"), to: "/centro-ayuda#faq" },

    { label: t("footer.help"), to: "/centro-ayuda" },

  ];



  const legalLinks = [

    { label: t("footer.terms"), to: "/legal/terminos" },

    { label: t("footer.privacy"), to: "/legal/privacidad" },

    { label: t("footer.cookiesPolicy"), to: "/legal/cookies" },

    { label: t("footer.legalNotice"), to: "/legal/aviso" },

  ];



  return (

    <footer className="site-footer site-footer--v2" role="contentinfo">

      <div className="site-footer-inner">

        <div className="site-footer-grid">

          <section className="site-footer-col site-footer-col--brand" aria-labelledby="footer-brand">

            <Link to="/" className="site-footer-brand" id="footer-brand">
              <HospyLogo height={72} variant="full" className="site-footer-brand-logo" alt="Hospy" />
            </Link>

            <p className="site-footer-tagline">{t("footer.tagline")}</p>

            <div className="site-footer-badges">

              <span className="site-footer-badge">

                <PrimeIcon name="pi-check-circle" size={14} />

                {t("footer.verified")}

              </span>

              <span className="site-footer-badge site-footer-badge--muted">

                <PrimeIcon name="pi-lock" size={14} />

                {t("footer.ssl")}

              </span>

            </div>

            <p className="site-footer-copy">

              © {YEAR} Hospy – {t("footer.rights")}

            </p>

            <p className="site-footer-country">

              <span aria-hidden>🇵🇪</span> {t("footer.country")}

            </p>

          </section>



          <nav className="site-footer-col" aria-labelledby="footer-company">

            <h3 id="footer-company">{t("footer.company")}</h3>

            <ul>

              {companyLinks.map((item) => (

                <li key={item.to}>

                  <Link to={item.to}>{item.label}</Link>

                </li>

              ))}

            </ul>

          </nav>



          <nav className="site-footer-col" aria-labelledby="footer-legal">

            <h3 id="footer-legal">{t("footer.legal")}</h3>

            <ul>

              {legalLinks.map((item) => (

                <li key={item.to}>

                  <Link to={item.to}>{item.label}</Link>

                </li>

              ))}

              <li>

                <button type="button" className="site-footer-link-btn" onClick={openCookiePrefs}>

                  {t("footer.cookies")}

                </button>

              </li>

            </ul>

            {cookieHint && (

              <p className="site-footer-cookie-hint" role="status">

                {cookieHint}

              </p>

            )}

          </nav>



          <section className="site-footer-col" aria-labelledby="footer-social">

            <h3 id="footer-social">{t("footer.follow")}</h3>

            <div className="site-footer-social">

              {FOOTER_SOCIAL.map((s) => (

                <a

                  key={s.id}

                  href={s.href}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="site-footer-social-link"

                  aria-label={s.label}

                >

                  <FooterSocialIcon id={s.id} />

                </a>

              ))}

            </div>

            <ul className="site-footer-contact">

              {contact.email ? (
                <li>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              ) : null}

              {contact.phone ? (
                <li>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a>
                </li>
              ) : null}

              {contact.whatsapp ? (
                <li>
                  <a
                    href={contact.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-footer-whatsapp"
                  >
                    <PrimeIcon name="pi-whatsapp" size={16} />
                    WhatsApp
                  </a>
                </li>
              ) : null}

            </ul>

            <p className="site-footer-trust-line">

              <PrimeIcon name="pi-shield" size={14} />

              {t("footer.safeBooking")}

            </p>

          </section>

        </div>



        <div className="site-footer-bar">

          <div className="site-footer-bar-group">

            <label className="site-footer-select-label" htmlFor="footer-lang">

              {t("footer.language")}

            </label>

            <select

              id="footer-lang"

              className="site-footer-select"

              value={language}

              onChange={(e) => setLanguage(e.target.value as typeof language)}

              aria-label={t("footer.language")}

            >

              {FOOTER_LANGUAGES.map((opt) => (

                <option key={opt.value} value={opt.value}>

                  {opt.label}

                </option>

              ))}

            </select>

          </div>



          <div className="site-footer-bar-group">

            <label className="site-footer-select-label" htmlFor="footer-currency">

              {t("footer.currency")}

            </label>

            <select

              id="footer-currency"

              className="site-footer-select"

              value={currency}

              onChange={(e) => setCurrency(e.target.value as typeof currency)}

              aria-label={t("footer.currency")}

            >

              {FOOTER_CURRENCIES.map((opt) => (

                <option key={opt.value} value={opt.value}>

                  {opt.label}

                </option>

              ))}

            </select>

          </div>



          <div className="site-footer-payments" aria-label="Métodos de pago aceptados">

            {FOOTER_PAYMENT_METHODS.map((name) => (

              <span key={name} className="site-footer-payment-pill">

                {name}

              </span>

            ))}

          </div>



          <div className="site-footer-bar-trust">

            <span className="site-footer-badge site-footer-badge--accent">

              <PrimeIcon name="pi-star-fill" size={14} />

              {t("footer.bestPrice")}

            </span>

            <a

              href={FOOTER_TRUST.complaintsBook.href}

              target="_blank"

              rel="noopener noreferrer"

              className="site-footer-complaints"

            >

              {t("footer.complaints")}

            </a>

          </div>

        </div>

      </div>

    </footer>

  );

}


