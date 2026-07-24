// Visual / computed-style verification of dark mode.
// Sets the dsDarkMode cookie, loads pages that always exist on any DSpace instance,
// asserts the key surfaces resolve to dark values, and captures screenshots.

/** Sum of the R+G+B channels of an "rgb(a)(...)" string. Low = dark, high = light. */
function rgbSum(color: string): number {
  const parts = (color.match(/\d+(\.\d+)?/g) || []).map(Number);
  return (parts[0] || 0) + (parts[1] || 0) + (parts[2] || 0);
}

function bgSum($el: JQuery): number {
  return rgbSum(getComputedStyle($el[0]).backgroundColor);
}

function colorSum($el: JQuery): number {
  return rgbSum(getComputedStyle($el[0]).color);
}

describe('Dark mode - visual check', () => {
  beforeEach(() => {
    // Enable dark mode (DarkModeService stores the boolean as a JSON cookie)
    cy.setCookie('dsDarkMode', 'true');
    cy.viewport(1366, 900);
  });

  it('home page renders in dark mode', () => {
    cy.visit('/');
    // Core invariant: the attribute is on <html> (set during SSR from the cookie)
    cy.get('html').should('have.attr', 'data-bs-theme', 'dark');
    // Page background is dark
    cy.get('body').should($b => expect(bgSum($b), 'body background').to.be.lessThan(200));
    // Navbar menu items are light text (previously the bug: dark text -> invisible)
    cy.get('.ds-menu-item, ds-navbar a').first()
      .should($el => expect(colorSum($el), 'navbar link color').to.be.greaterThan(400));
    // Footer is dark (was hard-coded #ffffff)
    cy.get('footer').should($f => expect(bgSum($f), 'footer background').to.be.lessThan(250));
    cy.screenshot('dark-01-home', { capture: 'fullPage' });
  });

  it('search page: breadcrumb bar, facets, thumbnails', () => {
    cy.visit('/search');
    cy.get('html').should('have.attr', 'data-bs-theme', 'dark');
    // Breadcrumb bar should be dark (was --ds-breadcrumb-bg = light gray)
    cy.get('body').then($body => {
      const crumb = $body.find('ds-breadcrumbs .breadcrumb, ds-themed-breadcrumbs .breadcrumb');
      if (crumb.length) {
        expect(bgSum(crumb), 'breadcrumb bar background').to.be.lessThan(300);
      }
    });
    // Facet filter panels (use --bs-light, now dark)
    cy.get('body').then($body => {
      const facet = $body.find('.facet-filter');
      if (facet.length) {
        expect(bgSum(facet), 'facet filter background').to.be.lessThan(300);
      }
    });
    // Thumbnail placeholder boxes (were a light card with dark text)
    cy.get('body').then($body => {
      const ph = $body.find('.thumbnail-placeholder');
      if (ph.length) {
        expect(bgSum(ph), 'thumbnail placeholder background').to.be.lessThan(300);
      }
    });
    cy.screenshot('dark-02-search', { capture: 'fullPage' });
  });

  it('community list + a community page (breadcrumb)', () => {
    cy.visit('/community-list');
    cy.get('html').should('have.attr', 'data-bs-theme', 'dark');
    cy.screenshot('dark-03-community-list', { capture: 'fullPage' });

    // Drill into the first community to exercise a breadcrumb-bearing page
    cy.get('body').then($body => {
      const link = $body.find('ds-community-list a[href*="/communities/"], a[href*="/collections/"]').first();
      if (link.length) {
        cy.wrap(link).click();
        cy.get('html').should('have.attr', 'data-bs-theme', 'dark');
        cy.get('body').should($b => expect(bgSum($b), 'community page body').to.be.lessThan(200));
        cy.screenshot('dark-04-community', { capture: 'fullPage' });
      }
    });
  });

  it('dark mode settings page + the toggle', () => {
    cy.visit('/info/dark-mode');
    cy.get('html').should('have.attr', 'data-bs-theme', 'dark');
    cy.contains('h2', /dark mode/i).should('be.visible');
    cy.screenshot('dark-05-settings', { capture: 'fullPage' });
  });

  it('control: light mode is unaffected (no cookie)', () => {
    cy.clearCookie('dsDarkMode');
    cy.visit('/');
    cy.get('html').should('not.have.attr', 'data-bs-theme');
    cy.get('body').should($b => expect(bgSum($b), 'light body background').to.be.greaterThan(600));
    cy.screenshot('light-01-home', { capture: 'fullPage' });
  });
});
