import React from 'react'
import { Text, View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { AppBar, Screen, ScrollArea } from '@/components'
import { colors, fontWeights, radii } from '@/theme'
import type { AuthScreenProps } from '@/navigation/types'

export interface LegalSubsection {
  heading?: string
  intro?: string
  bullets?: string[]
  body?: string[]
}

export interface LegalSection {
  heading: string
  intro?: string
  bullets?: string[]
  body?: string[]
  subsections?: LegalSubsection[]
}

interface LegalDocumentScreenProps {
  title: string
  effectiveDate: string
  lastUpdated: string
  intro: string
  sections: LegalSection[]
}

function Paragraphs({ items }: { items?: string[] }) {
  if (!items) return null
  return (
    <View style={s.block}>
      {items.map((paragraph, i) => (
        <Text key={i} style={s.paragraph}>
          {paragraph}
        </Text>
      ))}
    </View>
  )
}

function Bullets({ items }: { items?: string[] }) {
  if (!items) return null
  return (
    <View style={s.block}>
      {items.map((bullet, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDot}>{'\u2022'}</Text>
          <Text style={s.bulletText}>{bullet}</Text>
        </View>
      ))}
    </View>
  )
}

function Subsection({ sub }: { sub: LegalSubsection }) {
  return (
    <View style={s.subsection}>
      {sub.heading ? <Text style={s.subheading}>{sub.heading}</Text> : null}
      {sub.intro ? <Text style={s.paragraph}>{sub.intro}</Text> : null}
      <Bullets items={sub.bullets} />
      <Paragraphs items={sub.body} />
    </View>
  )
}

export function LegalDocumentScreen({
  title,
  effectiveDate,
  lastUpdated,
  intro,
  sections,
}: LegalDocumentScreenProps) {
  const navigation = useNavigation<AuthScreenProps<'Terms'>['navigation']>()

  return (
    <Screen bg={colors.bg}>
      <AppBar title={title} back={() => navigation.goBack()} />
      <ScrollArea py={20} px={20}>
        <View style={s.card}>
          <View style={s.metaRow}>
            <Text style={s.meta}>
              Effective Date: <Text style={s.metaStrong}>{effectiveDate}</Text>
            </Text>
            <Text style={s.meta}>
              Last Updated: <Text style={s.metaStrong}>{lastUpdated}</Text>
            </Text>
          </View>
          <Text style={s.intro}>{intro}</Text>

          {sections.map((section, i) => (
            <View key={i} style={s.section}>
              <Text style={s.heading}>{section.heading}</Text>
              {section.intro ? <Text style={s.paragraph}>{section.intro}</Text> : null}
              <Bullets items={section.bullets} />
              <Paragraphs items={section.body} />
              {section.subsections?.map((sub, j) => (
                <Subsection key={j} sub={sub} />
              ))}
            </View>
          ))}
        </View>
      </ScrollArea>
    </Screen>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  meta: {
    fontSize: 12,
    color: colors.textSub,
  },
  metaStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  intro: {
    fontSize: 14,
    color: colors.textSub,
    lineHeight: 22,
    marginBottom: 24,
  },
  section: {
    marginBottom: 22,
  },
  heading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 21,
    marginBottom: 8,
  },
  block: {
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 13,
    color: colors.blueInk,
    marginRight: 8,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSub,
    lineHeight: 21,
  },
  subsection: {
    marginTop: 4,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
})
