// Basketball Victoria age group calculator.
// BV uses the athlete's age on December 31 of the competition year to determine age group.

export interface BVAgeGroupResult {
  currentAge:       number
  ageOnDec31:       number
  bvAgeGroup:       string   // 'Under 8' | 'Under 10' | ... | 'Senior'
  playingYear:      string | null  // 'First Year' | 'Second Year' | null (Senior)
  birthYear:        number
  displayLabel:     string   // e.g. "U16 — First Year (born 2010)"
  nextRecalcDate:   string   // ISO date of next Jan 1
}

export function calcBVAgeGroup(dob: string): BVAgeGroupResult {
  const born       = new Date(dob + 'T00:00:00')
  const today      = new Date()
  const year       = today.getFullYear()
  const birthYear  = born.getFullYear()

  // Current age
  let currentAge = year - birthYear
  if (
    today.getMonth() < born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())
  ) currentAge--

  // Age on 31 December of the current year (everyone will have had their birthday by then)
  const ageOnDec31 = year - birthYear

  // BV age group rules: bracket determined by age on Dec 31
  let bvAgeGroup: string
  let playingYear: string | null

  if (ageOnDec31 <= 6)       { bvAgeGroup = 'Under 8';  playingYear = 'First Year'  }
  else if (ageOnDec31 === 7) { bvAgeGroup = 'Under 8';  playingYear = 'First Year'  }
  else if (ageOnDec31 === 8) { bvAgeGroup = 'Under 8';  playingYear = 'Second Year' }
  else if (ageOnDec31 === 9) { bvAgeGroup = 'Under 10'; playingYear = 'First Year'  }
  else if (ageOnDec31 === 10){ bvAgeGroup = 'Under 10'; playingYear = 'Second Year' }
  else if (ageOnDec31 === 11){ bvAgeGroup = 'Under 12'; playingYear = 'First Year'  }
  else if (ageOnDec31 === 12){ bvAgeGroup = 'Under 12'; playingYear = 'Second Year' }
  else if (ageOnDec31 === 13){ bvAgeGroup = 'Under 14'; playingYear = 'First Year'  }
  else if (ageOnDec31 === 14){ bvAgeGroup = 'Under 14'; playingYear = 'Second Year' }
  else if (ageOnDec31 === 15){ bvAgeGroup = 'Under 16'; playingYear = 'First Year'  }
  else if (ageOnDec31 === 16){ bvAgeGroup = 'Under 16'; playingYear = 'Second Year' }
  else if (ageOnDec31 === 17){ bvAgeGroup = 'Under 18'; playingYear = 'First Year'  }
  else if (ageOnDec31 === 18){ bvAgeGroup = 'Under 18'; playingYear = 'Second Year' }
  else if (ageOnDec31 === 19){ bvAgeGroup = 'Under 20'; playingYear = 'First Year'  }
  else if (ageOnDec31 === 20){ bvAgeGroup = 'Under 20'; playingYear = 'Second Year' }
  else                       { bvAgeGroup = 'Senior';   playingYear = null           }

  const abbrev = bvAgeGroup === 'Senior' ? 'Senior' : bvAgeGroup.replace('Under ', 'U')
  const displayLabel = bvAgeGroup === 'Senior'
    ? `Senior (born ${birthYear})`
    : `${abbrev} — ${playingYear} (born ${birthYear})`

  const nextRecalcDate = `${year + 1}-01-01`

  return { currentAge, ageOnDec31, bvAgeGroup, playingYear, birthYear, displayLabel, nextRecalcDate }
}
